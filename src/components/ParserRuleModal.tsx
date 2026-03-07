import { useState, useEffect } from 'react';
import { ParserRule, Endianness, InterpretationType } from '@/types/can';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HexByteInput } from '@/components/HexByteInput';

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

const INTERPRETATIONS: InterpretationType[] = ['unsigned', 'signed', 'hex', 'decimal', 'bitfield', 'boolean', 'scaled'];

export function ParserRuleModal({ open, onClose, onSave, rule }: Props) {
  const [form, setForm] = useState<ParserRule>(emptyRule());

  useEffect(() => {
    if (open) setForm(rule ? { ...rule } : emptyRule());
  }, [open, rule]);

  const handleSave = () => {
    onSave({ ...form, displayName: form.displayName || form.name });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{rule ? 'Edit Parser Rule' : 'New Parser Rule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
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

          <div>
            <Label className="text-[10px]">RX ID (hex)</Label>
            <Input className="h-7 text-xs font-mono bg-muted" value={form.rxId} onChange={e => setForm({ ...form, rxId: e.target.value.toUpperCase() })} />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-[10px]">Start Byte</Label>
              <Input className="h-7 text-xs font-mono bg-muted" type="number" value={form.startByte} onChange={e => setForm({ ...form, startByte: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-[10px]">Length</Label>
              <Input className="h-7 text-xs font-mono bg-muted" type="number" value={form.byteLength} onChange={e => setForm({ ...form, byteLength: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label className="text-[10px]">Endianness</Label>
              <Select value={form.endianness} onValueChange={v => setForm({ ...form, endianness: v as Endianness })}>
                <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="big" className="text-xs">Big</SelectItem>
                  <SelectItem value="little" className="text-xs">Little</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Type</Label>
              <Select value={form.interpretation} onValueChange={v => setForm({ ...form, interpretation: v as InterpretationType })}>
                <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
                <SelectContent>{INTERPRETATIONS.map(i => <SelectItem key={i} value={i} className="text-xs">{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">Scale</Label>
              <Input className="h-7 text-xs font-mono bg-muted" type="number" step="0.01" value={form.scale} onChange={e => setForm({ ...form, scale: parseFloat(e.target.value) || 1 })} />
            </div>
            <div>
              <Label className="text-[10px]">Offset</Label>
              <Input className="h-7 text-xs font-mono bg-muted" type="number" value={form.offset} onChange={e => setForm({ ...form, offset: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-[10px]">Unit</Label>
              <Input className="h-7 text-xs bg-muted" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="V, A, °C..." />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs" onClick={handleSave} disabled={!form.name || !form.rxId}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
