import { ConnectionStatus as CS } from '@/types/can';
import { Wifi, WifiOff, Radio } from 'lucide-react';

interface Props {
  status: CS;
}

export function StatusBar({ status }: Props) {
  const formatTime = (ts: number | null) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-card border-b border-border text-[10px] text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground text-xs">CAN FD Workstation</span>
        </div>

        <div className="flex items-center gap-1">
          {status.backend ? (
            <><span className="can-status-dot active" /><span>Backend</span></>
          ) : (
            <><span className="can-status-dot error" /><span>Backend offline</span></>
          )}
        </div>

        <div className="flex items-center gap-1">
          {status.canInterface ? (
            <><span className="can-status-dot active" /><span>CAN IF</span></>
          ) : (
            <><span className="can-status-dot error" /><span>CAN IF down</span></>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <span>TX: <span className="font-mono text-can-tx">{status.txCount}</span></span>
      <span>RX: <span className="font-mono text-can-rx">{status.rxCount}</span></span>
      <span>Last: {formatTime(status.lastActivity)}</span>
    </div>
  );
}
