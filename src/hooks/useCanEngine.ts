import { useState, useCallback, useRef } from 'react';
import { CanFrame, PredefinedMessage, ParsedValue, ParserRule, ConnectionStatus } from '@/types/can';
import { applyParserRule } from '@/data/mockData';

export function useCanEngine() {
  const [messages, setMessages] = useState<PredefinedMessage[]>([]);
  const [parserRules, setParserRules] = useState<ParserRule[]>([]);
  const [frames, setFrames] = useState<CanFrame[]>([]);
  const [parsedValues, setParsedValues] = useState<Map<string, ParsedValue>>(new Map());
  const [isPaused, setIsPaused] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    backend: false,
    canInterface: false,
    lastActivity: null,
    txCount: 0,
    rxCount: 0,
  });
  const cyclicTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Process an incoming RX frame (call this from WebSocket handler)
  const processRxFrame = useCallback((frame: CanFrame) => {
    if (isPausedRef.current) return;
    setFrames(prev => {
      const next = [...prev, frame];
      return next.length > 2000 ? next.slice(-1500) : next;
    });
    setConnectionStatus(prev => ({
      ...prev,
      rxCount: prev.rxCount + 1,
      lastActivity: Date.now(),
    }));
    // Apply parser rules
    if (frame.direction === 'RX') {
      setParsedValues(prev => {
        const next = new Map(prev);
        for (const rule of parserRules) {
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
    }
  }, [parserRules]);

  // Send a message via future API: POST /api/send
  const sendMessage = useCallback((msg: PredefinedMessage) => {
    const frame: CanFrame = {
      id: `frame-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      direction: 'TX',
      canId: msg.txId,
      frameType: msg.dlc > 8 ? 'CAN FD' : 'Classic',
      dlc: msg.dlc,
      dataBytes: [...msg.dataBytes],
      status: 'Sent',
    };
    setFrames(prev => [...prev, frame]);
    setConnectionStatus(prev => ({
      ...prev,
      txCount: prev.txCount + 1,
      lastActivity: Date.now(),
    }));

    // TODO: Replace with real API call
    // fetch('/api/send', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ canId: msg.txId, dlc: msg.dlc, data: msg.dataBytes }),
    // });
  }, []);

  const startCyclic = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    if (cyclicTimers.current.has(msgId)) return;
    const timer = setInterval(() => {
      if (!isPausedRef.current) {
        sendMessage(msg);
      }
    }, msg.cyclePeriodMs);
    cyclicTimers.current.set(msgId, timer);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isCyclicRunning: true } : m));

    // TODO: Replace with real API call
    // fetch(`/api/send/cyclic/start`, { method: 'POST', body: JSON.stringify({ messageId: msgId }) });
  }, [messages, sendMessage]);

  const stopCyclic = useCallback((msgId: string) => {
    const timer = cyclicTimers.current.get(msgId);
    if (timer) {
      clearInterval(timer);
      cyclicTimers.current.delete(msgId);
    }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isCyclicRunning: false } : m));

    // TODO: Replace with real API call
    // fetch(`/api/send/cyclic/stop`, { method: 'POST', body: JSON.stringify({ messageId: msgId }) });
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
    processRxFrame,
  };
}
