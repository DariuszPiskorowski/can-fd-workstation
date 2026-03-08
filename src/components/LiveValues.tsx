import { ParsedValue, ParserRule } from '@/types/can';
import { Activity } from 'lucide-react';

interface Props {
  rules: ParserRule[];
  parsedValues: Map<string, ParsedValue>;
}

export function LiveValues({ rules, parsedValues }: Props) {
  const pinnedRules = rules.filter(r => r.pinned);

  if (pinnedRules.length === 0) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="can-panel">
      <div className="can-panel-header py-1.5">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs">Live Values</span>
        </div>
      </div>
      <div className="flex gap-2 p-2 overflow-x-auto">
        {pinnedRules.map(rule => {
          const val = parsedValues.get(rule.id);
          return (
            <div key={rule.id} className="can-live-value min-w-[120px] shrink-0">
              <div className="text-[9px] text-muted-foreground mb-0.5">{rule.displayName}</div>
              <div className="flex items-baseline gap-1.5">
                <span className={`can-status-dot ${val ? 'active' : 'inactive'}`} />
                <span className="text-lg font-mono font-bold leading-none">
                  {val
                    ? rule.interpretation === 'ascii'
                      ? `"${val.asciiResult || ''}"`
                      : rule.interpretation === 'hex'
                        ? `0x${val.decimalResult.toString(16).toUpperCase()}`
                        : val.scaledResult.toFixed(rule.scale < 1 ? 2 : 0)
                    : '---'}
                </span>
                {rule.unit && <span className="text-[10px] text-muted-foreground">{rule.unit}</span>}
              </div>
              <div className="text-[8px] text-muted-foreground mt-0.5">
                {val ? formatTime(val.timestamp) : 'No data'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
