import { useState } from 'react';
import { ConditionalStep, FinalSuccessMessage, CanInterface } from '@/types/can';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { HexByteInput } from '@/components/HexByteInput';
import { Plus, Trash2, Copy, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

const DLC_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64];

function emptyConditionalStep(): ConditionalStep {
  return {
    id: `cstep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    enabled: true,
    txId: '18E05609',
    dlc: 8,
    dataBytes: Array(8).fill('00'),
    canInterface: 'can0',
    expectedResponseStart: Array(8).fill('00'),
    repeatIntervalMs: 40,
    maxRepeats: 20,
    timeoutAfterLastRepeatMs: 0,
  };
}

function emptyFinalMessage(): FinalSuccessMessage {
  return {
    enabled: false,
    txId: '18E05609',
    dlc: 3,
    dataBytes: Array(3).fill('00'),
    canInterface: 'can0',
  };
}

interface Props {
  steps: ConditionalStep[];
  onStepsChange: (steps: ConditionalStep[]) => void;
  finalOnSuccess: FinalSuccessMessage;
  onFinalChange: (final: FinalSuccessMessage) => void;
}

export function ConditionalSequenceEditor({ steps, onStepsChange, finalOnSuccess, onFinalChange }: Props) {
  const addStep = () => {
    onStepsChange([...steps, emptyConditionalStep()]);
  };

  const removeStep = (idx: number) => {
    onStepsChange(steps.filter((_, i) => i !== idx));
  };

  const duplicateStep = (idx: number) => {
    const dup = { ...steps[idx], id: `cstep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    const next = [...steps];
    next.splice(idx + 1, 0, dup);
    onStepsChange(next);
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    onStepsChange(next);
  };

  const updateStep = (idx: number, updates: Partial<ConditionalStep>) => {
    onStepsChange(steps.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  const handleStepDlcChange = (idx: number, dlc: number) => {
    const step = steps[idx];
    const dataBytes = Array(dlc).fill('00').map((v, i) => step.dataBytes[i] || '00');
    updateStep(idx, { dlc, dataBytes });
  };

  const handleFinalDlcChange = (dlc: number) => {
    const dataBytes = Array(dlc).fill('00').map((v, i) => finalOnSuccess.dataBytes[i] || '00');
    onFinalChange({ ...finalOnSuccess, dlc, dataBytes });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Conditional Steps</Label>
        <span className="text-[10px] text-muted-foreground">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
      </div>

      {steps.map((step, idx) => (
        <div
          key={step.id}
          className={`border rounded p-2.5 space-y-2 ${step.enabled ? 'border-border bg-muted/30' : 'border-border/50 bg-muted/10 opacity-60'}`}
        >
          {/* Step header */}
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] font-semibold text-primary">Step {idx + 1}</span>
            <div className="flex-1" />
            <Switch
              checked={step.enabled}
              onCheckedChange={v => updateStep(idx, { enabled: v })}
              className="h-4 w-7"
            />
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveStep(idx, -1)} disabled={idx === 0} title="Move up">
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} title="Move down">
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => duplicateStep(idx)} title="Duplicate">
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => removeStep(idx)} title="Remove">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {/* TX config */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">TX ID (hex)</Label>
              <Input className="h-7 text-xs font-mono bg-muted" value={step.txId} onChange={e => updateStep(idx, { txId: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <Label className="text-[10px]">DLC</Label>
              <Select value={step.dlc.toString()} onValueChange={v => handleStepDlcChange(idx, parseInt(v))}>
                <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
                <SelectContent>{DLC_OPTIONS.map(d => <SelectItem key={d} value={d.toString()} className="text-xs">{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Interface</Label>
              <Select value={step.canInterface} onValueChange={v => updateStep(idx, { canInterface: v as CanInterface })}>
                <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="can0" className="text-xs">can0</SelectItem>
                  <SelectItem value="can1" className="text-xs">can1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TX Data */}
          <div>
            <Label className="text-[10px]">TX Data Bytes</Label>
            <HexByteInput bytes={step.dataBytes} onChange={newBytes => updateStep(idx, { dataBytes: newBytes })} className="mt-1" />
          </div>

          {/* Expected Response */}
          <div>
            <Label className="text-[10px] text-accent">Expected Response (first 8 bytes)</Label>
            <HexByteInput
              bytes={step.expectedResponseStart}
              onChange={newBytes => updateStep(idx, { expectedResponseStart: newBytes })}
              className="mt-1"
            />
          </div>

          {/* Repeat config */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">Repeat interval (ms)</Label>
              <Input className="h-7 text-xs font-mono bg-muted" type="number" value={step.repeatIntervalMs} onChange={e => updateStep(idx, { repeatIntervalMs: parseInt(e.target.value) || 40 })} />
            </div>
            <div>
              <Label className="text-[10px]">Max repeats</Label>
              <Input className="h-7 text-xs font-mono bg-muted" type="number" value={step.maxRepeats} onChange={e => updateStep(idx, { maxRepeats: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label className="text-[10px]">Timeout (ms)</Label>
              <Input className="h-7 text-xs font-mono bg-muted" type="number" value={step.timeoutAfterLastRepeatMs} onChange={e => updateStep(idx, { timeoutAfterLastRepeatMs: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          {/* Summary */}
          <div className="text-[10px] font-mono text-muted-foreground bg-card px-2 py-1 rounded">
            Send step #{idx + 1} every {step.repeatIntervalMs}ms, up to {step.maxRepeats}×, wait for RX starting with [{step.expectedResponseStart.join(' ')}]
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full h-7 text-xs border-dashed" onClick={addStep}>
        <Plus className="h-3 w-3 mr-1" /> Add Conditional Step
      </Button>

      {/* Final success message */}
      <div className={`border rounded p-2.5 space-y-2 ${finalOnSuccess.enabled ? 'border-can-success/50 bg-can-success/5' : 'border-border/50 bg-muted/10'}`}
           style={finalOnSuccess.enabled ? { borderColor: 'hsl(var(--can-success) / 0.4)' } : {}}>
        <div className="flex items-center gap-2">
          <Switch
            checked={finalOnSuccess.enabled}
            onCheckedChange={v => onFinalChange({ ...finalOnSuccess, enabled: v })}
            className="h-4 w-7"
          />
          <Label className="text-[10px] font-semibold">Final message on success</Label>
        </div>

        {finalOnSuccess.enabled && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">TX ID (hex)</Label>
                <Input className="h-7 text-xs font-mono bg-muted" value={finalOnSuccess.txId} onChange={e => onFinalChange({ ...finalOnSuccess, txId: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label className="text-[10px]">DLC</Label>
                <Select value={finalOnSuccess.dlc.toString()} onValueChange={v => handleFinalDlcChange(parseInt(v))}>
                  <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
                  <SelectContent>{DLC_OPTIONS.map(d => <SelectItem key={d} value={d.toString()} className="text-xs">{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Interface</Label>
                <Select value={finalOnSuccess.canInterface} onValueChange={v => onFinalChange({ ...finalOnSuccess, canInterface: v as CanInterface })}>
                  <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="can0" className="text-xs">can0</SelectItem>
                    <SelectItem value="can1" className="text-xs">can1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[10px]">Data Bytes</Label>
              <HexByteInput bytes={finalOnSuccess.dataBytes} onChange={newBytes => onFinalChange({ ...finalOnSuccess, dataBytes: newBytes })} className="mt-1" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { emptyConditionalStep, emptyFinalMessage };
