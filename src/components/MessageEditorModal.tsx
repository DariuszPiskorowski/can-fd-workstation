import { useState, useEffect } from 'react';
import { PredefinedMessage, MessageCategory, SendMode } from '@/types/can';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const CATEGORIES: MessageCategory[] = ['Diagnostics', 'Control', 'Read requests', 'Test sequences', 'Custom'];

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
  };
}

export function MessageEditorModal({ open, onClose, onSave, message }: Props) {
  const [form, setForm] = useState<PredefinedMessage>(emptyMessage());

  useEffect(() => {
    if (open) {
      setForm(message ? { ...message } : emptyMessage());
    }
  }, [open, message]);

  const updateByte = (index: number, value: string) => {
    const clean = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 2).toUpperCase();
    const next = [...form.dataBytes];
    next[index] = clean.padStart(2, '0');
    setForm({ ...form, dataBytes: next });
  };

  const handleDlcChange = (dlc: number) => {
    const bytes = Array(dlc).fill('00').map((v, i) => form.dataBytes[i] || '00');
    setForm({ ...form, dlc, dataBytes: bytes });
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">{message ? 'Edit Message' : 'New Message'}</DialogTitle>
        </DialogHeader>

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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px]">TX ID (hex)</Label>
              <Input className="h-7 text-xs font-mono bg-muted" value={form.txId} onChange={e => setForm({ ...form, txId: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <Label className="text-[10px]">DLC</Label>
              <Select value={form.dlc.toString()} onValueChange={v => handleDlcChange(parseInt(v))}>
                <SelectTrigger className="h-7 text-xs bg-muted"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0,1,2,3,4,5,6,7,8,12,16,20,24,32,48,64].map(d => (
                    <SelectItem key={d} value={d.toString()} className="text-xs">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          {form.sendMode === 'cyclic' && (
            <div className="w-32">
              <Label className="text-[10px]">Cycle Period (ms)</Label>
              <Input className="h-7 text-xs font-mono bg-muted" type="number" value={form.cyclePeriodMs} onChange={e => setForm({ ...form, cyclePeriodMs: parseInt(e.target.value) || 100 })} />
            </div>
          )}

          <div>
            <Label className="text-[10px]">Data Bytes</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {form.dataBytes.map((b, i) => (
                <input
                  key={i}
                  className="can-byte-box bg-muted text-foreground border-border focus:ring-1 focus:ring-primary outline-none"
                  value={b}
                  onChange={e => updateByte(i, e.target.value)}
                  maxLength={2}
                />
              ))}
            </div>
          </div>

          <div className="text-[10px] font-mono text-muted-foreground bg-muted/50 p-2 rounded">
            Preview: [{form.txId}] DLC={form.dlc} {form.dataBytes.join(' ')}
          </div>

          <div>
            <Label className="text-[10px]">Notes</Label>
            <Input className="h-7 text-xs bg-muted" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs" onClick={handleSave} disabled={!form.name}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
