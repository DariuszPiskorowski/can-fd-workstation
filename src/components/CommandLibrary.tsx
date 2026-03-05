import { useState, useMemo } from 'react';
import { PredefinedMessage, MessageCategory } from '@/types/can';
import { Play, Square, Copy, Pencil, Trash2, Plus, Search, Download, Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const CATEGORIES: MessageCategory[] = ['Diagnostics', 'Control', 'Read requests', 'Test sequences', 'Custom'];

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
}

export function CommandLibrary({ messages, onSend, onStartCyclic, onStopCyclic, onEdit, onDuplicate, onDelete, onAdd, onExport, onImport }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MessageCategory | 'All'>('All');

  const filtered = useMemo(() => {
    return messages.filter(m => {
      const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [messages, search, selectedCategory]);

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
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleImport} title="Import">
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAdd} title="Add">
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
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-2 space-y-1.5">
          {filtered.map(msg => (
            <MessageCard
              key={msg.id}
              message={msg}
              onSend={() => onSend(msg)}
              onStartCyclic={() => onStartCyclic(msg.id)}
              onStopCyclic={() => onStopCyclic(msg.id)}
              onEdit={() => onEdit(msg)}
              onDuplicate={() => onDuplicate(msg.id)}
              onDelete={() => onDelete(msg.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">No messages found</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function MessageCard({
  message: msg,
  onSend, onStartCyclic, onStopCyclic, onEdit, onDuplicate, onDelete,
}: {
  message: PredefinedMessage;
  onSend: () => void;
  onStartCyclic: () => void;
  onStopCyclic: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-muted/50 border border-border rounded p-2 space-y-1.5">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate">{msg.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{msg.description}</div>
        </div>
        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 mr-4">{msg.category}</Badge>
      </div>

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

      <div className="flex items-center gap-0.5">
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
