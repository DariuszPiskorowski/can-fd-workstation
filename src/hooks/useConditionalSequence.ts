import { useState, useCallback, useRef, useEffect } from 'react';
import { PredefinedMessage, ConditionalSequenceState, CanFrame } from '@/types/can';

interface SendFrameFn {
  (txId: string, dlc: number, dataBytes: string[], canInterface: 'can0' | 'can1', opts?: { isExtendedId?: boolean; isFd?: boolean; bitrateSwitch?: boolean }): void;
}

interface AddFrameAnnotation {
  (frameId: string, annotation: string): void;
}

export function useConditionalSequence(
  sendSingleFrame: SendFrameFn,
  onStateChange: (msgId: string, state: ConditionalSequenceState) => void,
  onFrameAnnotation?: (annotation: string, direction: 'TX' | 'RX') => string,
) {
  const [runningSequenceId, setRunningSequenceId] = useState<string | null>(null);
  const abortRef = useRef(false);
  const stateRef = useRef<ConditionalSequenceState | null>(null);
  const matchCallbackRef = useRef<((frame: CanFrame) => void) | null>(null);

  const stopSequence = useCallback((msgId: string) => {
    abortRef.current = true;
    setRunningSequenceId(null);
    matchCallbackRef.current = null;
  }, []);

  const runSequence = useCallback(async (msg: PredefinedMessage) => {
    const steps = msg.conditionalSteps;
    if (!steps || steps.length === 0) return;

    if (runningSequenceId) {
      console.warn('Another conditional sequence is already running');
      return;
    }

    abortRef.current = false;
    setRunningSequenceId(msg.id);

    const enabledSteps = steps.filter(s => s.enabled);

    for (let i = 0; i < enabledSteps.length; i++) {
      if (abortRef.current) break;

      const step = enabledSteps[i];
      const state: ConditionalSequenceState = {
        status: 'running',
        currentStep: i + 1,
        repeatsUsed: 0,
        lastRxSeen: null,
        matched: false,
      };
      stateRef.current = state;
      onStateChange(msg.id, { ...state });

      const matched = await executeStep(msg, step, i, state);

      if (abortRef.current) break;

      if (!matched) {
        const failState: ConditionalSequenceState = {
          status: 'failed',
          currentStep: i + 1,
          repeatsUsed: state.repeatsUsed,
          lastRxSeen: state.lastRxSeen,
          matched: false,
          failReason: `Expected response not received at step ${i + 1}`,
        };
        stateRef.current = failState;
        onStateChange(msg.id, failState);
        setRunningSequenceId(null);
        matchCallbackRef.current = null;
        return;
      }
    }

    if (abortRef.current) {
      onStateChange(msg.id, {
        status: 'idle',
        currentStep: 0,
        repeatsUsed: 0,
        lastRxSeen: null,
        matched: false,
      });
      setRunningSequenceId(null);
      matchCallbackRef.current = null;
      return;
    }

    // All steps succeeded - send final message if configured
    if (msg.finalOnSuccess?.enabled) {
      const fin = msg.finalOnSuccess;
      sendSingleFrame(fin.txId, fin.dlc, fin.dataBytes, fin.canInterface, {
        isExtendedId: msg.isExtendedId,
        isFd: msg.isFd,
        bitrateSwitch: msg.bitrateSwitch,
      });
    }

    const successState: ConditionalSequenceState = {
      status: 'success',
      currentStep: enabledSteps.length,
      repeatsUsed: stateRef.current?.repeatsUsed ?? 0,
      lastRxSeen: stateRef.current?.lastRxSeen ?? null,
      matched: true,
    };
    onStateChange(msg.id, successState);
    setRunningSequenceId(null);
    matchCallbackRef.current = null;
  }, [runningSequenceId, sendSingleFrame, onStateChange]);

  const executeStep = (
    msg: PredefinedMessage,
    step: typeof msg.conditionalSteps extends (infer T)[] | undefined ? NonNullable<T> : never,
    stepIndex: number,
    state: ConditionalSequenceState,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      let repeats = 0;
      let resolved = false;

      const expectedPrefix = step.expectedResponseStart.map(b => b.toUpperCase());

      // Set up RX match callback
      matchCallbackRef.current = (frame: CanFrame) => {
        if (resolved || abortRef.current) return;
        if (frame.direction !== 'RX') return;

        state.lastRxSeen = frame.dataBytes.slice(0, 8);
        onStateChange(msg.id, { ...state });

        // Prefix match on first 8 bytes
        const rxPrefix = frame.dataBytes.slice(0, 8).map(b => b.toUpperCase());
        const matches = expectedPrefix.every((b, i) => rxPrefix[i] === b);

        if (matches) {
          resolved = true;
          state.matched = true;
          onStateChange(msg.id, { ...state });
          clearInterval(intervalId);
          resolve(true);
        }
      };

      // Start repeating TX
      const sendOnce = () => {
        if (resolved || abortRef.current) return;
        repeats++;
        state.repeatsUsed = repeats;
        onStateChange(msg.id, { ...state });

        sendSingleFrame(step.txId, step.dlc, step.dataBytes, step.canInterface, {
          isExtendedId: step.isExtendedId ?? msg.isExtendedId,
          isFd: step.isFd ?? msg.isFd,
          bitrateSwitch: step.bitrateSwitch ?? msg.bitrateSwitch,
        });

        if (repeats >= step.maxRepeats && !resolved) {
          clearInterval(intervalId);
          // Wait timeout then fail
          const timeout = step.timeoutAfterLastRepeatMs || 0;
          setTimeout(() => {
            if (!resolved && !abortRef.current) {
              resolved = true;
              resolve(false);
            }
          }, timeout);
        }
      };

      sendOnce();
      const intervalId = setInterval(sendOnce, step.repeatIntervalMs);

      // Safety: abort cleanup
      const checkAbort = setInterval(() => {
        if (abortRef.current && !resolved) {
          resolved = true;
          clearInterval(intervalId);
          clearInterval(checkAbort);
          resolve(false);
        }
      }, 50);

      // Clean up abort checker when resolved
      const origResolve = resolve;
    });
  };

  // Feed RX frames to the matcher
  const feedRxFrame = useCallback((frame: CanFrame) => {
    matchCallbackRef.current?.(frame);
  }, []);

  return {
    runSequence,
    stopSequence,
    feedRxFrame,
    runningSequenceId,
  };
}
