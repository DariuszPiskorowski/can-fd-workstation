import { useState, useCallback, useRef } from 'react';
import { CanFrame } from '@/types/can';

export type RecordFormat = 'plain' | 'csv';

export interface RecordTrigger {
  enabled: boolean;
  canId: string;
  prefixBytes: string[]; // 8 bytes, 'XX' = wildcard
}

export interface RecorderConfig {
  format: RecordFormat;
  startTrigger: RecordTrigger;
  stopTrigger: RecordTrigger;
}

export type RecorderStatus = 'idle' | 'armed' | 'recording';

const DEFAULT_CONFIG: RecorderConfig = {
  format: 'plain',
  startTrigger: { enabled: false, canId: '', prefixBytes: Array(8).fill('XX') },
  stopTrigger: { enabled: false, canId: '', prefixBytes: Array(8).fill('XX') },
};

function loadConfig(): RecorderConfig {
  try {
    const v = localStorage.getItem('can-recorder-config');
    return v ? { ...DEFAULT_CONFIG, ...JSON.parse(v) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function matchesTrigger(frame: CanFrame, trigger: RecordTrigger): boolean {
  if (!trigger.enabled || !trigger.canId) return false;
  if (frame.canId.toUpperCase().trim() !== trigger.canId.toUpperCase().trim()) return false;
  const prefix = trigger.prefixBytes.slice(0, 8);
  return prefix.every((b, i) => {
    const upper = b.toUpperCase();
    if (upper === 'XX' || upper === '--' || upper === '') return true;
    return (frame.dataBytes[i]?.toUpperCase() || '') === upper;
  });
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

function frameLine(frame: CanFrame, format: RecordFormat): string {
  const ts = formatTimestamp(frame.timestamp);
  const dir = frame.direction;
  const id = frame.canId;
  const iface = frame.canInterface;
  const type = frame.isFd ? 'FD' : 'CL';
  const dlc = frame.dlc;
  const data = frame.dataBytes.join(' ');

  if (format === 'csv') {
    return `${ts};${dir};${id};${iface};${type};${dlc};${data}`;
  }
  return `${ts}  ${dir}  ${id}  ${iface}  ${type}  DLC=${dlc}  ${data}`;
}

export function useFrameRecorder() {
  const [config, setConfig] = useState<RecorderConfig>(loadConfig);
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [frameCount, setFrameCount] = useState(0);
  const bufferRef = useRef<string[]>([]);
  const statusRef = useRef<RecorderStatus>('idle');
  const configRef = useRef(config);

  configRef.current = config;
  statusRef.current = status;

  const updateConfig = useCallback((c: RecorderConfig) => {
    setConfig(c);
    configRef.current = c;
    try { localStorage.setItem('can-recorder-config', JSON.stringify(c)); } catch {}
  }, []);

  const startRecording = useCallback(() => {
    bufferRef.current = [];
    const cfg = configRef.current;
    if (cfg.format === 'csv') {
      bufferRef.current.push('Timestamp;Direction;CAN_ID;Interface;Type;DLC;Data');
    }
    setFrameCount(0);
    setStatus('recording');
    statusRef.current = 'recording';
  }, []);

  const armTrigger = useCallback(() => {
    bufferRef.current = [];
    const cfg = configRef.current;
    if (cfg.format === 'csv') {
      bufferRef.current.push('Timestamp;Direction;CAN_ID;Interface;Type;DLC;Data');
    }
    setFrameCount(0);
    setStatus('armed');
    statusRef.current = 'armed';
  }, []);

  const stopAndDownload = useCallback(() => {
    const content = bufferRef.current.join('\n');
    const ext = configRef.current.format === 'csv' ? 'csv' : 'txt';
    const now = new Date();
    const fname = `can-log_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}.${ext}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
    bufferRef.current = [];
    setFrameCount(0);
    setStatus('idle');
    statusRef.current = 'idle';
  }, []);

  const cancel = useCallback(() => {
    bufferRef.current = [];
    setFrameCount(0);
    setStatus('idle');
    statusRef.current = 'idle';
  }, []);

  /** Call this for every frame (TX and RX) */
  const feedFrame = useCallback((frame: CanFrame) => {
    const st = statusRef.current;
    const cfg = configRef.current;

    if (st === 'armed') {
      if (cfg.startTrigger.enabled && matchesTrigger(frame, cfg.startTrigger)) {
        statusRef.current = 'recording';
        setStatus('recording');
        bufferRef.current.push(frameLine(frame, cfg.format));
        setFrameCount(bufferRef.current.length);
      }
      return;
    }

    if (st === 'recording') {
      bufferRef.current.push(frameLine(frame, cfg.format));
      setFrameCount(bufferRef.current.length);
      if (cfg.stopTrigger.enabled && matchesTrigger(frame, cfg.stopTrigger)) {
        stopAndDownload();
      }
    }
  }, [stopAndDownload]);

  return {
    config, updateConfig, status,
    startRecording, armTrigger, stopAndDownload, cancel, feedFrame,
    frameCount,
  };
}
