import { useState, useEffect } from 'react';
import { PredefinedMessage, MessageCategory, SendMode, SequenceStep, CanInterface, ConditionalStep, FinalSuccessMessage } from '@/types/can';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HexByteInput } from '@/components/HexByteInput';
import { ConditionalSequenceEditor, emptyFinalMessage } from '@/components/ConditionalSequenceEditor';

const CATEGORIES: MessageCategory[] = ['Diagnostics', 'Control', 'Read requests', 'Test sequences', 'Custom', 'Conditional Sequence'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (msg: PredefinedMessage) => void;
  message?: PredefinedMessage | null;
}

function emptyMessage(): PredefinedMessage {
  return {
    id: `msg-${Date.now()}`,
    name: '',
    description: '',
    category: 'Custom',
    txId: '18DA00F1',
    dlc: 8,
    dataBytes: Array(8).fill('00'),
    sendMode: 'one-shot',
    cyclePeriodMs: 100,
    active: true,
    canInterface: 'can0',
    sequenceSteps: [],
    sequenceDelayMs: 50,
    conditionalSteps: [],
    finalOnSuccess: emptyFinalMessage(),
  };
}

function emptyStep(): SequenceStep {
  return {
    txId: '18DA00F1',
    dlc: 8,
    dataBytes: Array(8).fill('00'),
    canInterface: 'can0',
  };
}

export function MessageEditorModal({ open, onClose, onSave, message }: Props) {
  const [form, setForm] = useState<PredefinedMessage>(emptyMessage());

  useEffect(() => {
    if (open) {
      setForm(message ? {
        ...message,
        sequenceSteps: message.sequenceSteps || [],
        sequenceDelayMs: message.sequenceDelayMs ?? 50,
        conditionalSteps: message.conditionalSteps || [],
        finalOnSuccess: message.finalOnSuccess || emptyFinalMessage(),
      } : emptyMessage());
    }
  }, [open, message]);

  const isConditionalSequence = form.category === 'Conditional Sequence';

  const updateBytes = (newBytes: string[]) => {
    setForm({ ...form, dataBytes: newBytes });
  };

  const handleDlcChange = (dlc: number) => {
    const bytes = Array(dlc).fill('00').map((v, i) => form.dataBytes[i] || '00');
    setForm({ ...form, dlc, dataBytes: bytes });
  };

  const updateStepBytes = (stepIdx: number, newBytes: string[]) => {
    const steps = [...(form.sequenceSteps || [])];
    steps[stepIdx] = { ...steps[stepIdx], dataBytes: newBytes };
    setForm({ ...form, sequenceSteps: steps });
  };

  const handleStepDlcChange = (stepIdx: number, dlc: number) => {
    const steps = [...(form.sequenceSteps || [])];
    const step = { ...steps[stepIdx] };
    step.dlc = dlc;
    step.dataBytes = Array(dlc).fill('00').map((v, i) => step.dataBytes[i] || '00');
    steps[stepIdx] = step;
    setForm({ ...form, sequenceSteps: steps });
  };

  const addStep = () => {
    setForm({ ...form, sequenceSteps: [...(form.sequenceSteps || []), emptyStep()] });
  };

  const removeStep = (idx: number) => {
    const steps = [...(form.sequenceSteps || [])];
    steps.splice(idx, 1);
    setForm({ ...form, sequenceSteps: steps });
  };

  const updateStep = (idx: number, updates: Partial<SequenceStep>) => {
    const steps = [...(form.sequenceSteps || [])];
    steps[idx] = { ...steps[idx], ...updates };
    setForm({ ...form, sequenceSteps: steps });
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const DLC_OPTIONS = [0,1,2,3,4,5,6,7,8,12,16,20,24,32,48,64];
  const hasSequence = (form.sequenceSteps?.length || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-sm">{message ? 'Edit Message' : 'New Message'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-3">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Name</Label>
                <Input className="h-7 text-xs bg-muted" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px]">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as MessageCategory })}>
                  <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-[10px]">Description</Label>
              <Input className="h-7 text-xs bg-muted" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Conditional Sequence mode */}
            {isConditionalSequence ? (
              <ConditionalSequenceEditor
                steps={form.conditionalSteps || []}
                onStepsChange={steps => setForm({ ...form, conditionalSteps: steps })}
                finalOnSuccess={form.finalOnSuccess || emptyFinalMessage()}
                onFinalChange={fin => setForm({ ...form, finalOnSuccess: fin })}
              />
            ) : (
              <>
                {/* Step 1 - Main message */}
                <div className="border border-border rounded p-2 space-y-2">
                  <div className="text-[10px] font-semibold text-muted-foreground">Step 1 (main)</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[10px]">TX ID (hex)</Label>
                      <Input className="h-7 text-xs font-mono bg-muted" value={form.txId} onChange={e => setForm({ ...form, txId: e.target.value.toUpperCase() })} />
                    </div>
                    <div>
                      <Label className="text-[10px]">DLC</Label>
                      <Select value={form.dlc.toString()} onValueChange={v => handleDlcChange(parseInt(v))}>
                        <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
                        <SelectContent>{DLC_OPTIONS.map(d => <SelectItem key={d} value={d.toString()} className="text-xs">{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Interface</Label>
                      <Select value={form.canInterface} onValueChange={v => setForm({ ...form, canInterface: v as CanInterface })}>
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
                    <HexByteInput bytes={form.dataBytes} onChange={updateBytes} className="mt-1" />
                  </div>
                </div>

                {/* Additional sequence steps */}
                {(form.sequenceSteps || []).map((step, idx) => (
                  <div key={idx} className="border border-border rounded p-2 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-semibold text-muted-foreground">Step {idx + 2}</div>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => removeStep(idx)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
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
                    <div>
                      <Label className="text-[10px]">Data Bytes</Label>
                      <HexByteInput bytes={step.dataBytes} onChange={(newBytes) => updateStepBytes(idx, newBytes)} className="mt-1" />
                    </div>
                  </div>
                ))}

                {/* Add step button */}
                <Button variant="outline" size="sm" className="w-full h-7 text-xs border-dashed" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" /> Add Step
                </Button>

                {/* Sequence delay */}
                {hasSequence && (
                  <div className="w-40">
                    <Label className="text-[10px]">Delay between steps (ms)</Label>
                    <Input className="h-7 text-xs font-mono bg-muted" type="number" value={form.sequenceDelayMs ?? 50} onChange={e => setForm({ ...form, sequenceDelayMs: parseInt(e.target.value) || 0 })} />
                  </div>
                )}
              </>
            )}

            {/* Send mode - not shown for conditional sequences */}
            {!isConditionalSequence && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px]">Send Mode</Label>
                  <Select value={form.sendMode} onValueChange={v => setForm({ ...form, sendMode: v as SendMode })}>
                    <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-shot" className="text-xs">One-shot</SelectItem>
                      <SelectItem value="cyclic" className="text-xs">Cyclic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.sendMode === 'cyclic' && (
                  <div>
                    <Label className="text-[10px]">Cycle Period (ms)</Label>
                    <Input className="h-7 text-xs font-mono bg-muted" type="number" value={form.cyclePeriodMs} onChange={e => setForm({ ...form, cyclePeriodMs: parseInt(e.target.value) || 100 })} />
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            <div className="text-[10px] font-mono text-muted-foreground bg-muted/50 p-2 rounded">
              {isConditionalSequence ? (
                <>
                  <div className="text-primary font-semibold mb-1">Conditional Sequence — {(form.conditionalSteps || []).filter(s => s.enabled).length} active steps</div>
                  {(form.conditionalSteps || []).map((s, i) => (
                    <div key={s.id} className={`${s.enabled ? '' : 'opacity-40'}`}>
                      Step {i + 1}: [{s.txId}] → expect [{s.expectedResponseStart.join(' ')}] ({s.repeatIntervalMs}ms × {s.maxRepeats})
                    </div>
                  ))}
                  {form.finalOnSuccess?.enabled && (
                    <div className="mt-1 text-can-success" style={{ color: 'hsl(var(--can-success))' }}>
                      Final: [{form.finalOnSuccess.txId}] {form.finalOnSuccess.dataBytes.join(' ')}
                    </div>
                  )}
                </>
              ) : (
                <>
                  Preview: [{form.txId}] DLC={form.dlc} {form.dataBytes.join(' ')}
                  {hasSequence && (
                    <>
                      {(form.sequenceSteps || []).map((s, i) => (
                        <div key={i} className="mt-0.5">
                          → [{s.txId}] DLC={s.dlc} {s.dataBytes.join(' ')}
                        </div>
                      ))}
                      <div className="mt-0.5 text-primary">Delay: {form.sequenceDelayMs}ms between steps</div>
                    </>
                  )}
                </>
              )}
            </div>

            <div>
              <Label className="text-[10px]">Notes</Label>
              <Input className="h-7 text-xs bg-muted" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs" onClick={handleSave} disabled={!form.name}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
