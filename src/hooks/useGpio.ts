import { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GpioTarget, GpioSwitch } from '@/types/gpio';

const FALLBACK_TARGETS: GpioTarget[] = [
  { name: 'linia17', chip: '/dev/gpiochip0', line: 17, available: true, state: 0 },
  { name: 'linia27', chip: '/dev/gpiochip0', line: 27, available: true, state: 0 },
  { name: 'linia22', chip: '/dev/gpiochip0', line: 22, available: true, state: 0 },
];

function loadJson<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

export function useGpio(socketRef: React.RefObject<Socket | null>) {
  const [targets, setTargets] = useState<GpioTarget[]>(FALLBACK_TARGETS);
  const receivedFromBackend = useRef(false);
  const [switches, setSwitches] = useState<GpioSwitch[]>(() => loadJson('gpio-switches', []));
  const [error, setError] = useState<string | null>(null);

  // Persist switches
  useEffect(() => {
    try { localStorage.setItem('gpio-switches', JSON.stringify(switches)); } catch {}
  }, [switches]);

  // Listen for GPIO socket events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onTargets = (data: { targets: GpioTarget[] }) => {
      receivedFromBackend.current = true;
      setTargets(data.targets);
    };

    const onState = (data: { target: string; state: number }) => {
      // Update the target state
      setTargets(prev => prev.map(t => t.name === data.target ? { ...t, state: data.state } : t));
      // Update switch states that match this target
      setSwitches(prev => prev.map(s => s.target === data.target ? { ...s, state: data.state } : s));
    };

    const onError = (data: { message: string }) => {
      if (data.message.startsWith('gpio')) {
        setError(data.message);
        setTimeout(() => setError(null), 5000);
      }
    };

    socket.on('gpio_targets', onTargets);
    socket.on('gpio_state', onState);
    socket.on('error', onError);

    // Request initial target list
    socket.emit('gpio_list_targets');

    return () => {
      socket.off('gpio_targets', onTargets);
      socket.off('gpio_state', onState);
      socket.off('error', onError);
    };
  }, [socketRef.current]);

  const refreshTargets = useCallback(() => {
    socketRef.current?.emit('gpio_list_targets');
  }, []);

  const setGpioState = useCallback((target: string, state: number) => {
    // Optimistic update
    const s = state ? 1 : 0;
    setTargets(prev => prev.map(t => t.name === target ? { ...t, state: s } : t));
    setSwitches(prev => prev.map(sw => sw.target === target ? { ...sw, state: s } : sw));
    socketRef.current?.emit('gpio_set', { target, state: s });
  }, []);

  const addSwitch = useCallback((label: string, target: string) => {
    const existing = targets.find(t => t.name === target);
    setSwitches(prev => [...prev, {
      id: `gpio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      target,
      state: existing?.state ?? 0,
    }]);
  }, [targets]);

  const removeSwitch = useCallback((id: string) => {
    setSwitches(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateSwitchLabel = useCallback((id: string, label: string) => {
    setSwitches(prev => prev.map(s => s.id === id ? { ...s, label } : s));
  }, []);

  return {
    targets,
    switches,
    error,
    refreshTargets,
    setGpioState,
    addSwitch,
    removeSwitch,
    updateSwitchLabel,
  };
}
