import { useState, useRef, useEffect, useMemo } from 'react';
import { CanFrame } from '@/types/can';
import { Pause, Play, Trash2, Search, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  frames: CanFrame[];
  isPaused: boolean;
  onPauseToggle: () => void;
  onClear: () => void;
  txCount: number;
  rxCount: number;
}

export function LiveTerminal({ frames, isPaused, onPauseToggle, onClear, txCount, rxCount }: Props) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [dirFilter, setDirFilter] = useState<'All' | 'TX' | 'RX'>('All');
  const [idFilter, setIdFilter] = useState('');
  const [dataSearch, setDataSearch] = useState('');
  const [selectedFrame, setSelectedFrame] = useState<CanFrame | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return frames.filter(f => {
      if (dirFilter !== 'All' && f.direction !== dirFilter) return false;
      if (idFilter && !f.canId.toLowerCase().includes(idFilter.toLowerCase())) return false;
      if (dataSearch && !f.dataBytes.join(' ').toLowerCase().includes(dataSearch.toLowerCase())) return false;
      return true;
    });
  }, [frames, dirFilter, idFilter, dataSearch]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  return (
    <div className="can-panel h-full flex flex-col">
      <div className="can-panel-header">
        <div className="flex items-center gap-3">
          <span>Live Terminal</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            TX: {txCount} | RX: {rxCount} | Showing: {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={autoScroll ? 'default' : 'ghost'}
            size="icon"
            className="h-6 w-6"
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto-scroll"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={isPaused ? 'default' : 'ghost'}
            size="icon"
            className="h-6 w-6"
            onClick={onPauseToggle}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear} title="Clear">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="px-2 py-1.5 flex items-center gap-2 border-b border-border">
        <div className="flex gap-1">
          {(['All', 'TX', 'RX'] as const).map(d => (
            <Badge
              key={d}
              variant={dirFilter === d ? 'default' : 'outline'}
              className={`cursor-pointer text-[10px] px-1.5 py-0 ${d === 'TX' && dirFilter === d ? 'bg-can-tx text-primary-foreground' : ''} ${d === 'RX' && dirFilter === d ? 'bg-can-rx text-primary-foreground' : ''}`}
              onClick={() => setDirFilter(d)}
            >
              {d}
            </Badge>
          ))}
        </div>
        <Input
          placeholder="Filter ID"
          value={idFilter}
          onChange={e => setIdFilter(e.target.value)}
          className="h-6 w-24 text-[10px] font-mono bg-muted border-border px-1.5"
        />
        <div className="relative flex-1">
          <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search data..."
            value={dataSearch}
            onChange={e => setDataSearch(e.target.value)}
            className="h-6 text-[10px] font-mono bg-muted border-border pl-6"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="px-3 py-1 flex items-center gap-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
        <span className="w-[72px]">Time</span>
        <span className="w-8">Dir</span>
        <span className="w-[72px]">CAN ID</span>
        <span className="w-10">Type</span>
        <span className="w-6">DLC</span>
        <span className="flex-1">Data</span>
        <span className="w-10">Status</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: 'hsl(var(--can-terminal-bg))' }}>
        {filtered.map(frame => (
          <div
            key={frame.id}
            className={`can-terminal-row flex items-center gap-2 ${selectedFrame?.id === frame.id ? 'selected' : ''} ${frame.parserMatched ? 'border-l-2 border-l-can-parser' : ''}`}
            onClick={() => setSelectedFrame(selectedFrame?.id === frame.id ? null : frame)}
          >
            <span className="w-[72px] text-muted-foreground">{formatTime(frame.timestamp)}</span>
            <span className="w-8">
              <span className={frame.direction === 'TX' ? 'can-tx-badge' : 'can-rx-badge'}>{frame.direction}</span>
            </span>
            <span className="w-[72px] font-mono">{frame.canId}</span>
            <span className="w-10 text-muted-foreground">{frame.frameType === 'CAN FD' ? 'FD' : 'CL'}</span>
            <span className="w-6 text-muted-foreground">{frame.dlc}</span>
            <span className="flex-1 font-mono truncate">
              {frame.dataBytes.slice(0, 16).join(' ')}{frame.dlc > 16 ? ' …' : ''}
              {frame.seqAnnotation && (
                <span className="ml-2 text-[9px] font-semibold px-1 py-0.5 rounded" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.12)' }}>
                  {frame.seqAnnotation}
                </span>
              )}
            </span>
            <span className="w-10 text-[10px] text-muted-foreground">{frame.status}</span>
          </div>
        ))}
      </div>

      {/* Frame inspector */}
      {selectedFrame && (
        <FrameInspector frame={selectedFrame} onClose={() => setSelectedFrame(null)} />
      )}
    </div>
  );
}

function FrameInspector({ frame, onClose }: { frame: CanFrame; onClose: () => void }) {
  return (
    <div className="border-t border-border bg-card p-3 max-h-[200px] overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold flex items-center gap-2">
          <span className={frame.direction === 'TX' ? 'can-tx-badge' : 'can-rx-badge'}>{frame.direction}</span>
          <span className="font-mono">{frame.canId}</span>
          <span className="text-muted-foreground">DLC {frame.dlc}</span>
          <span className="text-muted-foreground">{frame.frameType}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(frame.dlc, 16)}, 1fr)` }}>
        {/* Index row */}
        {frame.dataBytes.map((_, i) => (
          <div key={`idx-${i}`} className="text-center text-[8px] text-muted-foreground font-mono">
            {i}
          </div>
        ))}
        {/* Hex row */}
        {frame.dataBytes.map((b, i) => (
          <div key={`hex-${i}`} className="can-byte-box text-[10px]">
            {b}
          </div>
        ))}
        {/* Decimal row */}
        {frame.dataBytes.map((b, i) => (
          <div key={`dec-${i}`} className="text-center text-[8px] text-muted-foreground font-mono">
            {parseInt(b, 16)}
          </div>
        ))}
      </div>

      {frame.dlc > 16 && (
        <div className="text-[9px] text-muted-foreground mt-1">
          Showing first 16 of {frame.dlc} bytes. Full data: {frame.dataBytes.join(' ')}
        </div>
      )}
    </div>
  );
}
