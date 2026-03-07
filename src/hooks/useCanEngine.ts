import { useState, useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { CanFrame, PredefinedMessage, ParsedValue, ParserRule, ConnectionStatus, CanInterface, ConditionalSequenceState } from '@/types/can';
import { applyParserRule } from '@/data/mockData';
import { useConditionalSequence } from '@/hooks/useConditionalSequence';

const BACKEND_URL = localStorage.getItem('can-backend-url') || window.location.origin;

function loadJson<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function loadMap<V>(key: string): Map<string, V> {
  try { const v = localStorage.getItem(key); return v ? new Map(JSON.parse(v)) : new Map(); } catch { return new Map(); }
}

export function useCanEngine() {
  const [messages, setMessages] = useState<PredefinedMessage[]>(() => loadJson('can-messages', []));
  const [parserRules, setParserRules] = useState<ParserRule[]>(() => loadJson('can-parser-rules', []));
  const [frames, setFrames] = useState<CanFrame[]>([]);
  const [parsedValues, setParsedValues] = useState<Map<string, ParsedValue>>(() => loadMap('can-parsed-values'));
  const [isPaused, setIsPaused] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    backend: false,
    can0: false,
    can1: false,
    lastActivity: null,
    txCount: 0,
    rxCount: 0,
  });
  const socketRef = useRef<Socket | null>(null);
  const isPausedRef = useRef(isPaused);
  const parserRulesRef = useRef(parserRules);
  isPausedRef.current = isPaused;
  parserRulesRef.current = parserRules;

  // Persist to localStorage
  useEffect(() => { try { localStorage.setItem('can-messages', JSON.stringify(messages)); } catch {} }, [messages]);
  useEffect(() => { try { localStorage.setItem('can-parser-rules', JSON.stringify(parserRules)); } catch {} }, [parserRules]);
  useEffect(() => { try { localStorage.setItem('can-parsed-values', JSON.stringify(Array.from(parsedValues.entries()))); } catch {} }, [parsedValues]);

  const sendSingleFrame = useCallback((txId: string, dlc: number, dataBytes: string[], canInterface: CanInterface, opts?: { isExtendedId?: boolean; isFd?: boolean; bitrateSwitch?: boolean }) => {
    const isFd = opts?.isFd ?? (dlc > 8);
    const frame: CanFrame = {
      id: `frame-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      direction: 'TX',
      canId: txId,
      frameType: isFd ? 'CAN FD' : 'Classic',
      dlc,
      dataBytes: [...dataBytes],
      canInterface,
      isExtendedId: opts?.isExtendedId ?? true,
      isFd,
      bitrateSwitch: opts?.bitrateSwitch ?? isFd,
      status: 'Sent',
    };
    setFrames(prev => [...prev, frame]);
    setConnectionStatus(prev => ({
      ...prev,
      txCount: prev.txCount + 1,
      lastActivity: Date.now(),
    }));

    socketRef.current?.emit('send_frame', {
      canId: txId,
      dlc,
      data: dataBytes,
      interface: canInterface,
      isExtendedId: opts?.isExtendedId ?? true,
      isFd,
      bitrateSwitch: opts?.bitrateSwitch ?? isFd,
    });
  }, []);

  // Conditional sequence integration
  const handleCondStateChange = useCallback((msgId: string, state: ConditionalSequenceState) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, conditionalState: state } : m));
  }, []);

  const condSeq = useConditionalSequence(sendSingleFrame, handleCondStateChange);

  // WebSocket connection
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus(prev => ({ ...prev, backend: true }));
    });

    socket.on('disconnect', () => {
      setConnectionStatus(prev => ({ ...prev, backend: false, can0: false, can1: false }));
    });

    socket.on('status', (data: { can0: boolean; can1: boolean }) => {
      setConnectionStatus(prev => ({ ...prev, can0: data.can0, can1: data.can1 }));
    });

    socket.on('rx_frame', (data: { canId: string; dlc: number; data: string[]; interface: CanInterface; timestamp: number; isFd?: boolean; bitrateSwitch?: boolean; isExtendedId?: boolean }) => {
      if (isPausedRef.current) return;

      const frame: CanFrame = {
        id: `frame-${data.timestamp}-${Math.random()}`,
        timestamp: data.timestamp,
        direction: 'RX',
        canId: data.canId,
        frameType: data.isFd ? 'CAN FD' : (data.dlc > 8 ? 'CAN FD' : 'Classic'),
        dlc: data.dlc,
        dataBytes: data.data,
        canInterface: data.interface,
        isFd: data.isFd ?? false,
        bitrateSwitch: data.bitrateSwitch ?? false,
        isExtendedId: data.isExtendedId ?? true,
      };

      setFrames(prev => {
        const next = [...prev, frame];
        return next.length > 2000 ? next.slice(-1500) : next;
      });

      setConnectionStatus(prev => ({
        ...prev,
        rxCount: prev.rxCount + 1,
        lastActivity: Date.now(),
      }));

      // Feed to conditional sequence matcher
      condSeq.feedRxFrame(frame);

      // Apply parser rules
      setParsedValues(prev => {
        const next = new Map(prev);
        for (const rule of parserRulesRef.current) {
          if (rule.rxId === frame.canId) {
            const result = applyParserRule(rule, frame.dataBytes);
            if (result) {
              next.set(rule.id, {
                ruleId: rule.id,
                displayName: rule.displayName,
                rawBytes: result.rawBytes,
                decimalResult: result.decimal,
                scaledResult: result.scaled,
                unit: rule.unit,
                timestamp: frame.timestamp,
                active: true,
              });
            }
          }
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = useCallback((msg: PredefinedMessage) => {
    // Don't send conditional sequences with the normal send
    if (msg.category === 'Conditional Sequence') return;

    const msgOpts = { isExtendedId: msg.isExtendedId, isFd: msg.isFd, bitrateSwitch: msg.bitrateSwitch };
    const steps = [
      { txId: msg.txId, dlc: msg.dlc, dataBytes: msg.dataBytes, canInterface: msg.canInterface },
      ...(msg.sequenceSteps || []),
    ];
    const delay = msg.sequenceDelayMs ?? 50;

    sendSingleFrame(steps[0].txId, steps[0].dlc, steps[0].dataBytes, steps[0].canInterface, msgOpts);

    for (let i = 1; i < steps.length; i++) {
      const step = steps[i];
      setTimeout(() => {
        sendSingleFrame(step.txId, step.dlc, step.dataBytes, step.canInterface, msgOpts);
      }, delay * i);
    }
  }, [sendSingleFrame]);

  const startCyclic = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isCyclicRunning: true } : m));

    socketRef.current?.emit('start_cyclic', {
      messageId: msgId,
      canId: msg.txId,
      dlc: msg.dlc,
      data: msg.dataBytes,
      interface: msg.canInterface,
      periodMs: msg.cyclePeriodMs,
      isExtendedId: msg.isExtendedId ?? true,
      isFd: msg.isFd ?? (msg.dlc > 8),
      bitrateSwitch: msg.bitrateSwitch ?? (msg.dlc > 8),
    });
  }, [messages]);

  const stopCyclic = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isCyclicRunning: false } : m));
    socketRef.current?.emit('stop_cyclic', { messageId: msgId });
  }, []);

  const clearFrames = useCallback(() => {
    setFrames([]);
    setConnectionStatus(prev => ({ ...prev, txCount: 0, rxCount: 0 }));
  }, []);

  const addMessage = useCallback((msg: PredefinedMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((msg: PredefinedMessage) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
  }, []);

  const deleteMessage = useCallback((id: string) => {
    stopCyclic(id);
    setMessages(prev => prev.filter(m => m.id !== id));
  }, [stopCyclic]);

  const duplicateMessage = useCallback((id: string) => {
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    const dup: PredefinedMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      name: `${msg.name} (copy)`,
      isCyclicRunning: false,
      conditionalState: undefined,
    };
    setMessages(prev => [...prev, dup]);
  }, [messages]);

  const addParserRule = useCallback((rule: ParserRule) => {
    setParserRules(prev => [...prev, rule]);
  }, []);

  const updateParserRule = useCallback((rule: ParserRule) => {
    setParserRules(prev => prev.map(r => r.id === rule.id ? rule : r));
  }, []);

  const deleteParserRule = useCallback((id: string) => {
    setParserRules(prev => prev.filter(r => r.id !== id));
    setParsedValues(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const exportMessages = useCallback(() => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'can-messages.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  const exportParserRules = useCallback(() => {
    const blob = new Blob([JSON.stringify(parserRules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parser-rules.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [parserRules]);

  const importMessages = useCallback((json: string) => {
    try {
      const imported = JSON.parse(json) as PredefinedMessage[];
      setMessages(prev => [...prev, ...imported.map(m => ({ ...m, id: `msg-${Date.now()}-${Math.random()}`, isCyclicRunning: false }))]);
    } catch (e) { console.error('Invalid JSON', e); }
  }, []);

  const importParserRules = useCallback((json: string) => {
    try {
      const imported = JSON.parse(json) as ParserRule[];
      setParserRules(prev => [...prev, ...imported.map(r => ({ ...r, id: `rule-${Date.now()}-${Math.random()}` }))]);
    } catch (e) { console.error('Invalid JSON', e); }
  }, []);

  return {
    messages, frames, parserRules, parsedValues, isPaused, connectionStatus,
    setIsPaused, sendMessage, startCyclic, stopCyclic, clearFrames,
    addMessage, updateMessage, deleteMessage, duplicateMessage,
    addParserRule, updateParserRule, deleteParserRule,
    exportMessages, exportParserRules, importMessages, importParserRules,
    // Conditional sequence
    runConditionalSequence: condSeq.runSequence,
    stopConditionalSequence: condSeq.stopSequence,
    runningConditionalId: condSeq.runningSequenceId,
  };
}
