import { ConnectionStatus as CS } from '@/types/can';
import { Radio, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  status: CS;
}

export function StatusBar({ status }: Props) {
  const { dark, toggle } = useTheme();
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
          {status.can0 ? (
            <><span className="can-status-dot active" /><span>can0</span></>
          ) : (
            <><span className="can-status-dot error" /><span>can0 down</span></>
          )}
        </div>

        <div className="flex items-center gap-1">
          {status.can1 ? (
            <><span className="can-status-dot active" /><span>can1</span></>
          ) : (
            <><span className="can-status-dot error" /><span>can1 down</span></>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <span>TX: <span className="font-mono text-can-tx">{status.txCount}</span></span>
      <span>RX: <span className="font-mono text-can-rx">{status.rxCount}</span></span>
      <span>Last: {formatTime(status.lastActivity)}</span>

      <button
        onClick={toggle}
        className="ml-2 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title={dark ? 'Tryb jasny' : 'Tryb ciemny'}
      >
        {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
      <span className="text-[9px] font-mono text-muted-foreground/60 select-none">v2.3</span>
    </div>
  );
}
