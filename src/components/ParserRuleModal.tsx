import { useState, useEffect } from 'react';
import { ParserRule, ParserRuleCondition, Endianness, InterpretationType, CanInterface } from '@/types/can';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HexByteInput } from '@/components/HexByteInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (rule: ParserRule) => void;
  rule?: ParserRule | null;
}

function emptyRule(): ParserRule {
  return {
    id: `rule-${Date.now()}`,
    name: '',
    rxId: '',
    startByte: 0,
    byteLength: 1,
    endianness: 'big',
    interpretation: 'unsigned',
    scale: 1,
    offset: 0,
    unit: '',
    displayName: '',
    pinned: false,
  };
}

function emptyCondition(): ParserRuleCondition {
  return {
    id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: '',
    matchConditionBytes: Array(8).fill('XX'),
    startByte: 0,
    byteLength: 1,
    endianness: 'big',
    interpretation: 'unsigned',
    scale: 1,
    offset: 0,
    unit: '',
  };
}

const INTERPRETATIONS: InterpretationType[] = ['unsigned', 'signed', 'hex', 'decimal', 'bitfield', 'boolean', 'scaled', 'ascii'];

export function ParserRuleModal({ open, onClose, onSave, rule }: Props) {
  const [form, setForm] = useState<ParserRule>(emptyRule());
  const [expandedConds, setExpandedConds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      const f = rule ? { ...rule, additionalConditions: rule.additionalConditions ? [...rule.additionalConditions] : [] } : emptyRule();
      setForm(f);
      setExpandedConds(new Set());
    }
  }, [open, rule]);

  const handleSave = () => {
    const cleaned = {
      ...form,
      displayName: form.displayName || form.name,
      additionalConditions: (form.additionalConditions && form.additionalConditions.length > 0) ? form.additionalConditions : undefined,
    };
    onSave(cleaned);
    onClose();
  };

  const addCondition = () => {
    const c = emptyCondition();
    const conds = [...(form.additionalConditions || []), c];
    setForm({ ...form, additionalConditions: conds });
    setExpandedConds(prev => new Set([...prev, c.id]));
  };

  const removeCondition = (id: string) => {
    setForm({ ...form, additionalConditions: (form.additionalConditions || []).filter(c => c.id !== id) });
  };

  const updateCondition = (id: string, patch: Partial<ParserRuleCondition>) => {
    setForm({
      ...form,
      additionalConditions: (form.additionalConditions || []).map(c => c.id === id ? { ...c, ...patch } : c),
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedConds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">{rule ? 'Edit Parser Rule' : 'New Parser Rule'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-3 pb-2">
            {/* Base fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Rule Name</Label>
                <Input className="h-7 text-xs bg-muted" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px]">Display Name</Label>
                <Input className="h-7 text-xs bg-muted" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div>
                <Label className="text-[10px]">RX ID (hex)</Label>
                <Input className="h-7 text-xs font-mono bg-muted" value={form.rxId} onChange={e => setForm({ ...form, rxId: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label className="text-[10px]">RX Interface</Label>
                <Select value={form.rxInterface || 'any'} onValueChange={v => setForm({ ...form, rxInterface: v === 'any' ? undefined : v as CanInterface })}>
                  <SelectTrigger className="h-7 text-xs bg-muted w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any" className="text-xs">Any</SelectItem>
                    <SelectItem value="can0" className="text-xs">can0</SelectItem>
                    <SelectItem value="can1" className="text-xs">can1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Primary condition section */}
            <div className="border border-border rounded p-2 space-y-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Primary Condition</div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.matchConditionEnabled ?? false}
                  onCheckedChange={v => setForm({ ...form, matchConditionEnabled: v, matchConditionBytes: form.matchConditionBytes || Array(8).fill('XX') })}
                  className="scale-75"
                />
                <Label className="text-[10px]">If expected (match bytes)</Label>
              </div>
              {form.matchConditionEnabled && (
                <div>
                  <Label className="text-[10px]">Expected Data (Delete = wildcard --)</Label>
                  <HexByteInput
                    bytes={form.matchConditionBytes || Array(8).fill('XX')}
                    onChange={b => setForm({ ...form, matchConditionBytes: b })}
                    allowWildcard
                  />
                </div>
              )}

              <ConditionInterpretationFields
                startByte={form.startByte}
                byteLength={form.byteLength}
                endianness={form.endianness}
                interpretation={form.interpretation}
                scale={form.scale}
                offset={form.offset}
                unit={form.unit}
                onChange={patch => setForm({ ...form, ...patch })}
              />
            </div>

            {/* Additional conditions */}
            {(form.additionalConditions || []).map((cond, idx) => (
              <div key={cond.id} className="border border-border rounded space-y-0">
                <div
                  className="flex items-center gap-1 p-2 cursor-pointer hover:bg-muted/50 rounded-t"
                  onClick={() => toggleExpand(cond.id)}
                >
                  {expandedConds.has(cond.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                    Condition {idx + 2}{cond.label ? ` — ${cond.label}` : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive shrink-0"
                    onClick={e => { e.stopPropagation(); removeCondition(cond.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {expandedConds.has(cond.id) && (
                  <div className="p-2 pt-0 space-y-2">
                    <div>
                      <Label className="text-[10px]">Condition Label</Label>
                      <Input className="h-7 text-xs bg-muted" value={cond.label} onChange={e => updateCondition(cond.id, { label: e.target.value })} placeholder="e.g. State Active" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Expected Data (Delete = wildcard --)</Label>
                      <HexByteInput
                        bytes={cond.matchConditionBytes}
                        onChange={b => updateCondition(cond.id, { matchConditionBytes: b })}
                        allowWildcard
                      />
                    </div>
                    <ConditionInterpretationFields
                      startByte={cond.startByte}
                      byteLength={cond.byteLength}
                      endianness={cond.endianness}
                      interpretation={cond.interpretation}
                      scale={cond.scale}
                      offset={cond.offset}
                      unit={cond.unit}
                      onChange={patch => updateCondition(cond.id, patch)}
                    />
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={addCondition}>
              <Plus className="h-3 w-3" /> Add Condition Section
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs" onClick={handleSave} disabled={!form.name || !form.rxId}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Reusable interpretation fields block */
function ConditionInterpretationFields({
  startByte, byteLength, endianness, interpretation, scale, offset, unit, onChange,
}: {
  startByte: number; byteLength: number; endianness: Endianness; interpretation: InterpretationType;
  scale: number; offset: number; unit: string;
  onChange: (patch: Partial<{ startByte: number; byteLength: number; endianness: Endianness; interpretation: InterpretationType; scale: number; offset: number; unit: string }>) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label className="text-[10px]">Start Byte</Label>
          <Input className="h-7 text-xs font-mono bg-muted" type="number" value={startByte} onChange={e => onChange({ startByte: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-[10px]">Length</Label>
          <Input className="h-7 text-xs font-mono bg-muted" type="number" value={byteLength} onChange={e => onChange({ byteLength: parseInt(e.target.value) || 1 })} />
        </div>
        <div>
          <Label className="text-[10px]">Endianness</Label>
          <Select value={endianness} onValueChange={v => onChange({ endianness: v as Endianness })}>
            <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="big" className="text-xs">Big</SelectItem>
              <SelectItem value="little" className="text-xs">Little</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Type</Label>
          <Select value={interpretation} onValueChange={v => onChange({ interpretation: v as InterpretationType })}>
            <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>{INTERPRETATIONS.map(i => <SelectItem key={i} value={i} className="text-xs">{i}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px]">Scale</Label>
          <Input className="h-7 text-xs font-mono bg-muted" type="number" step="0.01" value={scale} onChange={e => onChange({ scale: parseFloat(e.target.value) || 1 })} />
        </div>
        <div>
          <Label className="text-[10px]">Offset</Label>
          <Input className="h-7 text-xs font-mono bg-muted" type="number" value={offset} onChange={e => onChange({ offset: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-[10px]">Unit</Label>
          <Input className="h-7 text-xs bg-muted" value={unit} onChange={e => onChange({ unit: e.target.value })} placeholder="V, A, °C..." />
        </div>
      </div>
    </>
  );
}
