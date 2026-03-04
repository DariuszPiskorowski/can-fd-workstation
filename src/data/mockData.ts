import { ParserRule } from '@/types/can';

export function applyParserRule(rule: ParserRule, dataBytes: string[]): { rawBytes: string[]; decimal: number; scaled: number } | null {
  if (rule.startByte + rule.byteLength > dataBytes.length) return null;
  const raw = dataBytes.slice(rule.startByte, rule.startByte + rule.byteLength);
  const ordered = rule.endianness === 'big' ? raw : [...raw].reverse();
  let decimal = 0;
  for (const b of ordered) {
    decimal = (decimal << 8) | parseInt(b, 16);
  }
  if (rule.interpretation === 'signed' && rule.byteLength <= 4) {
    const bits = rule.byteLength * 8;
    if (decimal >= (1 << (bits - 1))) {
      decimal -= (1 << bits);
    }
  }
  const scaled = decimal * rule.scale + rule.offset;
  return { rawBytes: raw, decimal, scaled };
}
