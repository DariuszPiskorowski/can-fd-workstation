import { useState, useMemo, useEffect, useRef } from 'react';
import { PredefinedMessage, MessageCategory } from '@/types/can';
import { GpioSwitch, GpioTarget } from '@/types/gpio';
import { GpioSwitchCard } from '@/components/GpioSwitchCard';
import { Play, Square, Copy, Pencil, Trash2, Plus, Search, Download, Upload, RefreshCw, Zap, CheckCircle2, XCircle, Loader2, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const CATEGORIES: MessageCategory[] = ['Diagnostics', 'Control', 'Read requests', 'Test sequences', 'Custom', 'Conditional Sequence'];

interface Props {
  messages: PredefinedMessage[];
  onSend: (msg: PredefinedMessage) => void;
  onStartCyclic: (id: string) => void;
  onStopCyclic: (id: string) => void;
  onEdit: (msg: PredefinedMessage) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onExport: () => void;
  onImport: (json: string) => void;
  onRunConditional?: (msg: PredefinedMessage) => void;
  onStopConditional?: (id: string) => void;
  runningConditionalId?: string | null;
  // GPIO
  gpioSwitches: GpioSwitch[];
  gpioTargets: GpioTarget[];
  onGpioToggle: (target: string, state: number) => void;
  onGpioDelete: (id: string) => void;
  onGpioAdd: () => void;
}

export function CommandLibrary({
  messages, onSend, onStartCyclic, onStopCyclic, onEdit, onDuplicate, onDelete, onAdd, onExport, onImport,
  onRunConditional, onStopConditional, runningConditionalId,
  gpioSwitches, gpioTargets, onGpioToggle, onGpioDelete, onGpioAdd,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MessageCategory | 'All' | 'GPIO'>('All');

  // Global insertion order registry (persisted in localStorage)
  const orderKey = 'panel-item-order';
  const [itemOrder, setItemOrder] = useState<string[]>(() => {
    try { const v = localStorage.getItem(orderKey); return v ? JSON.parse(v) : []; } catch { return []; }
  });

  // Keep order in sync: append new IDs at end, remove deleted ones
  useEffect(() => {
    const allIds = new Set([...messages.map(m => m.id), ...gpioSwitches.map(s => s.id)]);
    setItemOrder(prev => {
      const kept = prev.filter(id => allIds.has(id));
      // Find IDs not yet in registry — append at end in stable order
      const known = new Set(kept);
      const newIds: string[] = [];
      for (const m of messages) { if (!known.has(m.id)) newIds.push(m.id); }
      for (const s of gpioSwitches) { if (!known.has(s.id)) newIds.push(s.id); }
      if (newIds.length === 0 && kept.length === prev.length) return prev;
      const updated = [...kept, ...newIds];
      try { localStorage.setItem(orderKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [messages, gpioSwitches]);

  // Build unified ordered + filtered list
  type UiItem = { type: 'can'; id: string; msg: PredefinedMessage } | { type: 'gpio'; id: string; sw: GpioSwitch };

  const orderedItems = useMemo(() => {
    const canMap = new Map(messages.map(m => [m.id, m]));
    const gpioMap = new Map(gpioSwitches.map(s => [s.id, s]));

    const items: UiItem[] = [];
    for (const id of itemOrder) {
      const msg = canMap.get(id);
      if (msg) {
        // Apply CAN filters
        const matchesSearch = !search || msg.name.toLowerCase().includes(search.toLowerCase()) || msg.description.toLowerCase().includes(search.toLowerCase());
        const matchesCat = selectedCategory === 'All' || selectedCategory === 'GPIO' || msg.category === selectedCategory;
        if (selectedCategory !== 'GPIO' && matchesSearch && matchesCat) {
          items.push({ type: 'can', id, msg });
        }
        continue;
      }
      const sw = gpioMap.get(id);
      if (sw) {
        if (selectedCategory !== 'All' && selectedCategory !== 'GPIO') continue;
        const matchesSearch = !search || sw.label.toLowerCase().includes(search.toLowerCase()) || sw.target.toLowerCase().includes(search.toLowerCase());
        if (matchesSearch) {
          items.push({ type: 'gpio', id, sw });
        }
      }
    }
    return items;
  }, [itemOrder, messages, gpioSwitches, search, selectedCategory]);

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

  return (
    <div className="can-panel h-full flex flex-col">
      <div className="can-panel-header">
        <span>Command Library</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onExport} title="Export">
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleImport} title="Import">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onGpioAdd} title="Add GPIO Switch">
            <Cpu className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd} title="Add Message">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="px-2 py-2 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs bg-muted border-border"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={selectedCategory === 'All' ? 'default' : 'outline'}
            className="cursor-pointer text-[10px] px-1.5 py-0"
            onClick={() => setSelectedCategory('All')}
          >
            All
          </Badge>
          {CATEGORIES.map(cat => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className="cursor-pointer text-[10px] px-1.5 py-0"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'Conditional Sequence' ? 'Cond. Seq.' : cat}
            </Badge>
          ))}
          <Badge
            variant={selectedCategory === 'GPIO' ? 'default' : 'outline'}
            className="cursor-pointer text-[10px] px-1.5 py-0"
            onClick={() => setSelectedCategory('GPIO')}
            style={selectedCategory === 'GPIO' ? { background: 'hsl(var(--can-gpio))', color: 'hsl(var(--primary-foreground))' } : { color: 'hsl(var(--can-gpio))', borderColor: 'hsl(var(--can-gpio) / 0.4)' }}
          >
            GPIO
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-2 space-y-1.5">
          {orderedItems.map(item => {
            if (item.type === 'gpio') {
              return (
                <GpioSwitchCard
                  key={item.id}
                  gpioSwitch={item.sw}
                  targets={gpioTargets}
                  onToggle={onGpioToggle}
                  onDelete={onGpioDelete}
                />
              );
            }
            const msg = item.msg;
            return (
              <MessageCard
                key={item.id}
                message={msg}
                onSend={() => onSend(msg)}
                onStartCyclic={() => onStartCyclic(msg.id)}
                onStopCyclic={() => onStopCyclic(msg.id)}
                onEdit={() => onEdit(msg)}
                onDuplicate={() => onDuplicate(msg.id)}
                onDelete={() => onDelete(msg.id)}
                onRunConditional={onRunConditional ? () => onRunConditional(msg) : undefined}
                onStopConditional={onStopConditional ? () => onStopConditional(msg.id) : undefined}
                isConditionalRunning={runningConditionalId === msg.id}
              />
            );
          })}
          {orderedItems.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">No items found</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function MessageCard({
  message: msg,
  onSend, onStartCyclic, onStopCyclic, onEdit, onDuplicate, onDelete,
  onRunConditional, onStopConditional, isConditionalRunning,
}: {
  message: PredefinedMessage;
  onSend: () => void;
  onStartCyclic: () => void;
  onStopCyclic: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRunConditional?: () => void;
  onStopConditional?: () => void;
  isConditionalRunning?: boolean;
}) {
  const isConditional = msg.category === 'Conditional Sequence';
  const condState = msg.conditionalState;

  return (
    <div className={`bg-muted/50 border rounded p-2 space-y-1.5 ${
      isConditionalRunning ? 'border-primary/50' : 
      condState?.status === 'success' ? 'border-can-success/50' :
      condState?.status === 'failed' ? 'border-destructive/50' : 'border-border'
    }`} style={
      isConditionalRunning ? { borderColor: 'hsl(var(--primary) / 0.5)' } :
      condState?.status === 'success' ? { borderColor: 'hsl(var(--can-success) / 0.5)' } :
      condState?.status === 'failed' ? { borderColor: 'hsl(var(--destructive) / 0.5)' } : undefined
    }>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate">{msg.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{msg.description}</div>
        </div>
        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 mr-4">
          {isConditional ? 'Cond.Seq' : msg.category}
        </Badge>
      </div>

      {/* Conditional sequence status */}
      {isConditional && condState && condState.status !== 'idle' && (
        <div className="flex items-center gap-1.5 text-[10px]">
          {condState.status === 'running' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
              <span className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                Running — Step {condState.currentStep}
              </span>
              <span className="text-muted-foreground">
                ({condState.repeatsUsed}× sent)
              </span>
              {condState.matched && <span style={{ color: 'hsl(var(--can-success))' }}>✓ Matched</span>}
            </>
          )}
          {condState.status === 'success' && (
            <>
              <CheckCircle2 className="h-3 w-3" style={{ color: 'hsl(var(--can-success))' }} />
              <span className="font-semibold" style={{ color: 'hsl(var(--can-success))' }}>Success</span>
            </>
          )}
          {condState.status === 'failed' && (
            <>
              <XCircle className="h-3 w-3 text-destructive" />
              <span className="font-semibold text-destructive">
                Failed at Step {condState.currentStep}
              </span>
              {condState.failReason && (
                <span className="text-muted-foreground truncate">{condState.failReason}</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Standard message info */}
      {!isConditional && (
        <>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <span>ID: {msg.txId}</span>
            <span>DLC: {msg.dlc}</span>
            {(msg.sequenceSteps?.length || 0) > 0 && (
              <span className="text-primary">{(msg.sequenceSteps?.length || 0) + 1} steps</span>
            )}
            {(msg.sequenceSteps?.length || 0) > 0 && (
              <span>{msg.sequenceDelayMs}ms delay</span>
            )}
            {msg.sendMode === 'cyclic' && (
              <span className={msg.isCyclicRunning ? 'can-cyclic-indicator' : ''}>
                {msg.cyclePeriodMs}ms
              </span>
            )}
          </div>

          <div className="font-mono text-[10px] text-secondary-foreground bg-card px-1.5 py-1 rounded overflow-x-auto whitespace-nowrap">
            {msg.dataBytes.slice(0, 16).join(' ')}{msg.dlc > 16 ? ' ...' : ''}
            {(msg.sequenceSteps || []).map((s, i) => (
              <div key={i} className="text-muted-foreground">→ {s.dataBytes.slice(0, 16).join(' ')}{s.dlc > 16 ? ' ...' : ''}</div>
            ))}
          </div>
        </>
      )}

      {/* Conditional sequence info */}
      {isConditional && (
        <div className="font-mono text-[10px] text-secondary-foreground bg-card px-1.5 py-1 rounded space-y-0.5">
          {(msg.conditionalSteps || []).map((s, i) => (
            <div key={s.id} className={s.enabled ? '' : 'opacity-40'}>
              <span className="text-primary">#{i + 1}</span> [{s.txId}] {s.repeatIntervalMs}ms×{s.maxRepeats} → <span className="text-accent">{s.expectedResponseStart.slice(0, 4).join(' ')}…</span>
            </div>
          ))}
          {msg.finalOnSuccess?.enabled && (
            <div style={{ color: 'hsl(var(--can-success))' }}>
              ✓ Final: [{msg.finalOnSuccess.txId}] {msg.finalOnSuccess.dataBytes.join(' ')}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-0.5">
        {isConditional ? (
          isConditionalRunning ? (
            <Button variant="destructive" size="sm" className="h-6 text-[10px] px-1.5" onClick={onStopConditional}>
              <Square className="h-3 w-3 mr-0.5" /> Stop
            </Button>
          ) : (
            <Button size="sm" className="h-6 text-[10px] px-1.5" onClick={onRunConditional}
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              <Zap className="h-3 w-3 mr-0.5" /> Run Sequence
            </Button>
          )
        ) : (
          <>
            {msg.sendMode === 'cyclic' ? (
              msg.isCyclicRunning ? (
                <Button variant="destructive" size="sm" className="h-6 text-[10px] px-1.5" onClick={onStopCyclic}>
                  <Square className="h-3 w-3 mr-0.5" /> Stop
                </Button>
              ) : (
                <Button size="sm" className="h-6 text-[10px] px-1.5 bg-can-cyclic hover:bg-can-cyclic/80 text-primary-foreground" onClick={onStartCyclic}>
                  <RefreshCw className="h-3 w-3 mr-0.5" /> Cyclic
                </Button>
              )
            ) : null}
            <Button variant="default" size="sm" className="h-6 text-[10px] px-1.5" onClick={onSend}>
              <Play className="h-3 w-3 mr-0.5" /> Send
            </Button>
          </>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 mr-6">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onEdit} title="Edit"><Pencil className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onDuplicate} title="Duplicate"><Copy className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={onDelete} title="Delete"><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}
