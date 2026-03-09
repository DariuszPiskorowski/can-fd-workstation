import { useState } from 'react';
import { GpioTarget } from '@/types/gpio';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GpioSwitchModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (label: string, target: string) => void;
  targets: GpioTarget[];
}

export function GpioSwitchModal({ open, onClose, onSave, targets }: GpioSwitchModalProps) {
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');

  const handleSave = () => {
    if (!label.trim() || !target) return;
    onSave(label.trim(), target);
    setLabel('');
    setTarget('');
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setLabel('');
      setTarget('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add GPIO Switch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="gpio-label" className="text-xs">Label (visible name)</Label>
            <Input
              id="gpio-label"
              placeholder="e.g. Switch load on"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">GPIO Target</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select target..." />
              </SelectTrigger>
              <SelectContent>
                {targets.map(t => (
                  <SelectItem key={t.name} value={t.name}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{t.name}</span>
                      <span className="text-muted-foreground text-[10px]">
                        (GPIO{t.line} @ {t.chip})
                      </span>
                      {!t.available && (
                        <span className="text-destructive text-[10px]">unavailable</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {targets.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No GPIO targets configured on backend
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button onClick={handleSave} size="sm" disabled={!label.trim() || !target}>Add Switch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
