import { useState } from 'react';
import { GpioSwitch, GpioTarget } from '@/types/gpio';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Cpu, AlertTriangle } from 'lucide-react';

interface GpioSwitchCardProps {
  gpioSwitch: GpioSwitch;
  targets: GpioTarget[];
  onToggle: (target: string, state: number) => void;
  onDelete: (id: string) => void;
}

export function GpioSwitchCard({ gpioSwitch, targets, onToggle, onDelete }: GpioSwitchCardProps) {
  const target = targets.find(t => t.name === gpioSwitch.target);
  const isAvailable = target?.available ?? false;
  const isOn = gpioSwitch.state === 1;

  return (
    <div className={`bg-muted/50 border rounded p-2 space-y-1.5 ${
      !isAvailable ? 'border-destructive/40' : isOn ? 'border-can-gpio/50' : 'border-border'
    }`} style={
      !isAvailable ? { borderColor: 'hsl(var(--destructive) / 0.4)' } :
      isOn ? { borderColor: 'hsl(var(--can-gpio) / 0.5)' } : undefined
    }>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate">{gpioSwitch.label}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Cpu className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground">{gpioSwitch.target}</span>
            {target && (
              <span className="text-[10px] text-muted-foreground">
                (GPIO{target.line})
              </span>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 mr-4"
          style={{ color: 'hsl(var(--can-gpio))', borderColor: 'hsl(var(--can-gpio) / 0.4)' }}>
          GPIO
        </Badge>
      </div>

      {!isAvailable && (
        <div className="flex items-center gap-1 text-[10px] text-destructive">
          <AlertTriangle className="h-3 w-3" />
          <span>Target unavailable</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Switch
          checked={isOn}
          onCheckedChange={(checked) => onToggle(gpioSwitch.target, checked ? 1 : 0)}
          disabled={!isAvailable}
          className="data-[state=checked]:bg-can-gpio"
          style={{ '--switch-active': 'hsl(var(--can-gpio))' } as React.CSSProperties}
        />
        <span className={`text-[10px] font-semibold ${isOn ? '' : 'text-muted-foreground'}`}
          style={isOn ? { color: 'hsl(var(--can-gpio))' } : undefined}>
          {isOn ? 'ON' : 'OFF'}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => onDelete(gpioSwitch.id)} title="Remove">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
