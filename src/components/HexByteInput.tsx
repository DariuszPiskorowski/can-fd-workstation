import { useState, useRef, useCallback, KeyboardEvent, ClipboardEvent } from 'react';

interface HexByteInputProps {
  bytes: string[];
  onChange: (bytes: string[]) => void;
  className?: string;
}

function normalize(val: string): string {
  const clean = val.replace(/[^0-9a-fA-F]/g, '').slice(0, 2).toUpperCase();
  if (!clean) return '00';
  return clean.padStart(2, '0');
}

export function HexByteInput({ bytes, onChange, className }: HexByteInputProps) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const commit = useCallback((idx: number, val: string) => {
    const next = [...bytes];
    next[idx] = normalize(val);
    onChange(next);
  }, [bytes, onChange]);

  const focusByte = (idx: number) => {
    const el = refs.current[idx];
    if (el) {
      el.focus();
      requestAnimationFrame(() => el.select());
    }
  };

  const handleFocus = (idx: number) => {
    setEditIdx(idx);
    setEditVal(bytes[idx] || '00');
    requestAnimationFrame(() => refs.current[idx]?.select());
  };

  const handleBlur = (idx: number) => {
    commit(idx, editVal);
    setEditIdx(null);
  };

  const handleChange = (idx: number, raw: string) => {
    const clean = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 2).toUpperCase();
    setEditVal(clean);

    // Auto-advance after 2 valid chars
    if (clean.length === 2 && idx < bytes.length - 1) {
      commit(idx, clean);
      setEditIdx(null);
      focusByte(idx + 1);
    }
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;

    if (e.key === 'Enter') {
      e.preventDefault();
      commit(idx, editVal);
      if (idx < bytes.length - 1) focusByte(idx + 1);
      else input.blur();
      return;
    }

    if (e.key === 'Backspace' && editVal === '' && idx > 0) {
      e.preventDefault();
      focusByte(idx - 1);
      return;
    }

    if (e.key === 'ArrowRight' && input.selectionStart === editVal.length && idx < bytes.length - 1) {
      e.preventDefault();
      commit(idx, editVal);
      focusByte(idx + 1);
      return;
    }

    if (e.key === 'ArrowLeft' && input.selectionStart === 0 && idx > 0) {
      e.preventDefault();
      commit(idx, editVal);
      focusByte(idx - 1);
      return;
    }
  };

  const handlePaste = (idx: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text/plain').trim();
    // If paste contains spaces or is longer than 2 chars, distribute across bytes
    if (text.length > 2 || text.includes(' ')) {
      e.preventDefault();
      const parts = text.split(/[\s,]+/).filter(Boolean);
      const next = [...bytes];
      for (let i = 0; i < parts.length && idx + i < next.length; i++) {
        next[idx + i] = normalize(parts[i]);
      }
      onChange(next);
      setEditIdx(null);
      const target = Math.min(idx + parts.length, bytes.length - 1);
      focusByte(target);
    }
  };

  return (
    <div className={`flex flex-wrap gap-1 ${className || ''}`}>
      {bytes.map((b, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          className="can-byte-box bg-muted text-foreground border-border focus:ring-1 focus:ring-primary outline-none"
          value={editIdx === i ? editVal : b}
          onFocus={() => handleFocus(i)}
          onBlur={() => handleBlur(i)}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={e => handlePaste(i, e)}
          maxLength={2}
          spellCheck={false}
          autoComplete="off"
        />
      ))}
    </div>
  );
}
