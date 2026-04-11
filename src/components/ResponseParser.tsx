import { useState } from 'react';
import { ParserRule, ParsedValue } from '@/types/can';
import { Plus, Trash2, Pin, Download, Upload, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { FrameRecorderPanel } from '@/components/FrameRecorderPanel';
import { RecorderConfig, RecorderStatus } from '@/hooks/useFrameRecorder';

interface Props {
  rules: ParserRule[];
  parsedValues: Map<string, ParsedValue>;
  onAddRule: () => void;
  onEditRule: (rule: ParserRule) => void;
  onDeleteRule: (id: string) => void;
  onTogglePin: (id: string) => void;
  onExport: () => void;
  onImport: (json: string) => void;
  recorder: {
    config: RecorderConfig;
    status: RecorderStatus;
    frameCount: number;
    onUpdateConfig: (c: RecorderConfig) => void;
    onStartManual: () => void;
    onArm: () => void;
    onStop: () => void;
    onCancel: () => void;
  };
}

export function ResponseParser({ rules, parsedValues, onAddRule, onEditRule, onDeleteRule, onTogglePin, onExport, onImport, recorder }: Props) {
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => onImport(ev.target?.result as string);
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="can-panel h-full flex flex-col">
      <div className="can-panel-header">
        <span>Response Parser</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onExport} title="Export"><Upload className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleImport} title="Import"><Download className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddRule} title="Add Rule"><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-2 space-y-1.5">
          {rules.map(rule => {
            const val = parsedValues.get(rule.id);
            const condVals = (rule.additionalConditions || []).map(c => ({
              cond: c,
              val: parsedValues.get(`${rule.id}__${c.id}`),
            }));
            return (
              <div key={rule.id} className="bg-muted/50 border border-border rounded p-2 space-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold">{rule.displayName}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      RX ID: {rule.rxId}{rule.rxInterface ? ` @ ${rule.rxInterface}` : ''} · Byte {rule.startByte}:{rule.byteLength} · {rule.endianness.toUpperCase()} · {rule.interpretation}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-5 w-5 ${rule.pinned ? 'text-primary' : ''}`}
                      onClick={() => onTogglePin(rule.id)}
                    >
                      <Pin className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEditRule(rule)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => onDeleteRule(rule.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <ParsedValueRow val={val} rule={rule} formatTime={formatTime} label="Primary" />

                {condVals.map(({ cond, val: cv }) => (
                  <ParsedValueRow key={cond.id} val={cv} rule={{ ...rule, interpretation: cond.interpretation, scale: cond.scale, unit: cond.unit }} formatTime={formatTime} label={cond.label || `Cond #${(rule.additionalConditions!.indexOf(cond) + 2)}`} />
                ))}
              </div>
            );
          })}
          {rules.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">
              No parser rules defined. Click + to add one.
            </div>
          )}
        </div>
      </ScrollArea>

      <FrameRecorderPanel
        config={recorder.config}
        status={recorder.status}
        frameCount={recorder.frameCount}
        onUpdateConfig={recorder.onUpdateConfig}
        onStartManual={recorder.onStartManual}
        onArm={recorder.onArm}
        onStop={recorder.onStop}
        onCancel={recorder.onCancel}
      />
    </div>
  );
}

function ParsedValueRow({ val, rule, formatTime, label }: { val?: ParsedValue; rule: Pick<ParserRule, 'interpretation' | 'scale' | 'unit'>; formatTime: (ts: number) => string; label?: string }) {
  return val ? (
    <div className="flex items-center gap-3 bg-card rounded px-2 py-1">
      <span className="can-status-dot active" />
      {label && <span className="text-[9px] text-muted-foreground font-medium">{label}</span>}
      <span className="text-sm font-mono font-bold">
        {rule.interpretation === 'ascii'
          ? `"${val.asciiResult || ''}"`
          : rule.interpretation === 'hex'
            ? `0x${val.decimalResult.toString(16).toUpperCase()}`
            : val.scaledResult.toFixed(rule.scale < 1 ? 2 : 0)}
      </span>
      {rule.unit && <span className="text-xs text-muted-foreground">{rule.unit}</span>}
      <span className="text-[9px] text-muted-foreground ml-auto">
        Raw: {val.rawBytes.join(' ')} · {formatTime(val.timestamp)}
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-2 py-1">
      <span className="can-status-dot inactive" />
      {label && <span className="font-medium mr-1">{label}:</span>}
      Waiting for data...
    </div>
  );
}
