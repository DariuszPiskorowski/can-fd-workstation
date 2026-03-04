import { PredefinedMessage, ParserRule, CanFrame } from '@/types/can';

export const MOCK_MESSAGES: PredefinedMessage[] = [
  {
    id: 'msg-1',
    name: 'Read Battery Voltage',
    description: 'Request battery voltage from BMS',
    category: 'Read requests',
    txId: '18DA00F1',
    dlc: 8,
    dataBytes: ['22', 'F1', '90', '00', '00', '00', '00', '00'],
    sendMode: 'one-shot',
    cyclePeriodMs: 100,
    active: true,
  },
  {
    id: 'msg-2',
    name: 'Read Temperature',
    description: 'Request temperature sensor data',
    category: 'Read requests',
    txId: '18DA00F1',
    dlc: 8,
    dataBytes: ['22', 'F1', '91', '00', '00', '00', '00', '00'],
    sendMode: 'one-shot',
    cyclePeriodMs: 200,
    active: true,
  },
  {
    id: 'msg-3',
    name: 'Tester Present',
    description: 'Keep diagnostic session alive',
    category: 'Diagnostics',
    txId: '18DA00F1',
    dlc: 8,
    dataBytes: ['3E', '00', '00', '00', '00', '00', '00', '00'],
    sendMode: 'cyclic',
    cyclePeriodMs: 2000,
    active: true,
    isCyclicRunning: false,
  },
  {
    id: 'msg-4',
    name: 'Extended Diag Session',
    description: 'Enter extended diagnostic session',
    category: 'Diagnostics',
    txId: '18DA00F1',
    dlc: 8,
    dataBytes: ['10', '03', '00', '00', '00', '00', '00', '00'],
    sendMode: 'one-shot',
    cyclePeriodMs: 100,
    active: true,
  },
  {
    id: 'msg-5',
    name: 'Motor Enable',
    description: 'Enable motor controller output',
    category: 'Control',
    txId: '0CF00400',
    dlc: 8,
    dataBytes: ['01', '00', 'FF', '00', '00', '00', '00', '00'],
    sendMode: 'one-shot',
    cyclePeriodMs: 100,
    active: true,
  },
  {
    id: 'msg-6',
    name: 'Speed Command 50%',
    description: 'Set motor speed to 50%',
    category: 'Control',
    txId: '0CF00400',
    dlc: 8,
    dataBytes: ['02', '00', '80', '00', '00', '00', '00', '00'],
    sendMode: 'cyclic',
    cyclePeriodMs: 50,
    active: true,
    isCyclicRunning: false,
  },
  {
    id: 'msg-7',
    name: 'Counter Test',
    description: 'Incrementing counter for test',
    category: 'Test sequences',
    txId: '1FFFFFFF',
    dlc: 64,
    dataBytes: Array.from({ length: 64 }, (_, i) => i.toString(16).toUpperCase().padStart(2, '0')),
    sendMode: 'one-shot',
    cyclePeriodMs: 100,
    active: true,
  },
];

export const MOCK_PARSER_RULES: ParserRule[] = [
  {
    id: 'rule-1',
    name: 'Battery Voltage',
    rxId: '18DAF100',
    startByte: 3,
    byteLength: 2,
    endianness: 'big',
    interpretation: 'scaled',
    scale: 0.01,
    offset: 0,
    unit: 'V',
    displayName: 'Battery Voltage',
    pinned: true,
  },
  {
    id: 'rule-2',
    name: 'Coolant Temperature',
    rxId: '18DAF100',
    startByte: 3,
    byteLength: 1,
    endianness: 'big',
    interpretation: 'signed',
    scale: 1,
    offset: -40,
    unit: '°C',
    displayName: 'Coolant Temp',
    pinned: true,
  },
  {
    id: 'rule-3',
    name: 'Motor RPM',
    rxId: '0CF00401',
    startByte: 2,
    byteLength: 2,
    endianness: 'little',
    interpretation: 'scaled',
    scale: 0.25,
    offset: 0,
    unit: 'rpm',
    displayName: 'Motor RPM',
    pinned: true,
  },
  {
    id: 'rule-4',
    name: 'Motor Current',
    rxId: '0CF00401',
    startByte: 4,
    byteLength: 2,
    endianness: 'big',
    interpretation: 'scaled',
    scale: 0.1,
    offset: -1600,
    unit: 'A',
    displayName: 'Motor Current',
    pinned: true,
  },
  {
    id: 'rule-5',
    name: 'Status Byte',
    rxId: '0CF00401',
    startByte: 0,
    byteLength: 1,
    endianness: 'big',
    interpretation: 'hex',
    scale: 1,
    offset: 0,
    unit: '',
    displayName: 'Status',
    pinned: false,
  },
];

const randomHexByte = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0');

const RX_IDS = ['18DAF100', '0CF00401', '18FEF100', '0CF00301'];

let frameCounter = 0;

export function generateMockRxFrame(): CanFrame {
  frameCounter++;
  const canId = RX_IDS[Math.floor(Math.random() * RX_IDS.length)];
  const dlc = Math.random() > 0.7 ? 64 : 8;
  return {
    id: `frame-${Date.now()}-${frameCounter}`,
    timestamp: Date.now(),
    direction: 'RX',
    canId,
    frameType: dlc > 8 ? 'CAN FD' : 'Classic',
    dlc,
    dataBytes: Array.from({ length: dlc }, () => randomHexByte()),
    status: 'OK',
  };
}

export function generateMockTxFrame(msg: PredefinedMessage): CanFrame {
  frameCounter++;
  return {
    id: `frame-${Date.now()}-${frameCounter}`,
    timestamp: Date.now(),
    direction: 'TX',
    canId: msg.txId,
    frameType: msg.dlc > 8 ? 'CAN FD' : 'Classic',
    dlc: msg.dlc,
    dataBytes: [...msg.dataBytes],
    status: 'Sent',
  };
}

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
