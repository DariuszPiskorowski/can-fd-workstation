import { useState } from 'react';
import { Circle, Square, Shield, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RecorderConfig, RecorderStatus, RecordFormat, RecordTrigger } from '@/hooks/useFrameRecorder';
import { HexByteInput } from '@/components/HexByteInput';

interface Props {
  config: RecorderConfig;
  status: RecorderStatus;
  frameCount: number;
  onUpdateConfig: (c: RecorderConfig) => void;
  onStartManual: () => void;
  onArm: () => void;
  onStop: () => void;
  onCancel: () => void;
}

function TriggerEditor({ label, trigger, onChange }: { label: string; trigger: RecordTrigger; onChange: (t: RecordTrigger) => void }) {
  return (
    <div className="space-y-2 border border-border rounded p-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">{label}</Label>
        <Switch checked={trigger.enabled} onCheckedChange={(v) => onChange({ ...trigger, enabled: v })} />
      </div>
      {trigger.enabled && (
        <>
          <div>
            <Label className="text-[10px] text-muted-foreground">CAN ID</Label>
            <Input
              className="h-7 text-xs font-mono"
              value={trigger.canId}
              onChange={(e) => onChange({ ...trigger, canId: e.target.value.toUpperCase() })}
              placeholder="e.g. 18E05608"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Data prefix (XX = wildcard)</Label>
            <HexByteInput
              bytes={trigger.prefixBytes}
              onChange={(bytes) => onChange({ ...trigger, prefixBytes: bytes })}
              maxBytes={8}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function FrameRecorderPanel({ config, status, frameCount, onUpdateConfig, onStartManual, onArm, onStop, onCancel }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<RecorderConfig>(config);

  const openSettings = () => { setDraft(config); setSettingsOpen(true); };
  const saveSettings = () => { onUpdateConfig(draft); setSettingsOpen(false); };

  const statusColor = status === 'recording' ? 'text-red-500' : status === 'armed' ? 'text-yellow-500' : 'text-muted-foreground';
  const statusLabel = status === 'recording' ? 'REC' : status === 'armed' ? 'ARMED' : 'IDLE';

  const hasStartTrigger = config.startTrigger.enabled;

  return (
    <>
      <div className="border-t border-border px-2 py-1.5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Circle className={`h-3 w-3 ${status === 'recording' ? 'fill-red-500 text-red-500 animate-pulse' : status === 'armed' ? 'fill-yellow-500 text-yellow-500 animate-pulse' : 'text-muted-foreground'}`} />
            <span className={`text-[10px] font-bold ${statusColor}`}>{statusLabel}</span>
            {status !== 'idle' && (
              <Badge variant="outline" className="text-[9px] h-4 px-1">{frameCount} frames</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={openSettings} title="Recorder settings">
            <Settings2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex gap-1">
          {status === 'idle' && (
            <>
              <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1 gap-1" onClick={onStartManual}>
                <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500" /> Manual REC
              </Button>
              {hasStartTrigger && (
                <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1 gap-1" onClick={onArm}>
                  <Shield className="h-2.5 w-2.5" /> Arm Trigger
                </Button>
              )}
            </>
          )}
          {status === 'recording' && (
            <Button size="sm" variant="destructive" className="h-6 text-[10px] flex-1 gap-1" onClick={onStop}>
              <Square className="h-2.5 w-2.5" /> Stop & Save
            </Button>
          )}
          {status === 'armed' && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1 gap-1 border-yellow-500/50" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm">Frame Recorder Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">File format</Label>
              <Select value={draft.format} onValueChange={(v) => setDraft({ ...draft, format: v as RecordFormat })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain text (.txt)</SelectItem>
                  <SelectItem value="csv">CSV / semicolon (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TriggerEditor
              label="Start Trigger (Trigger IN)"
              trigger={draft.startTrigger}
              onChange={(t) => setDraft({ ...draft, startTrigger: t })}
            />

            <TriggerEditor
              label="Stop Trigger (Trigger OUT)"
              trigger={draft.stopTrigger}
              onChange={(t) => setDraft({ ...draft, stopTrigger: t })}
            />

            <Button size="sm" className="w-full" onClick={saveSettings}>Save Settings</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
