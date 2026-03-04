export type SendMode = 'one-shot' | 'cyclic';

export type MessageCategory = 'Diagnostics' | 'Control' | 'Read requests' | 'Test sequences' | 'Custom';

export interface PredefinedMessage {
  id: string;
  name: string;
  description: string;
  category: MessageCategory;
  txId: string;
  dlc: number;
  dataBytes: string[];
  sendMode: SendMode;
  cyclePeriodMs: number;
  active: boolean;
  isCyclicRunning?: boolean;
  notes?: string;
}

export type FrameDirection = 'TX' | 'RX';
export type FrameType = 'CAN FD' | 'Classic';

export interface CanFrame {
  id: string;
  timestamp: number;
  direction: FrameDirection;
  canId: string;
  frameType: FrameType;
  dlc: number;
  dataBytes: string[];
  status?: string;
  notes?: string;
  parserMatched?: boolean;
}

export type Endianness = 'big' | 'little';
export type InterpretationType =
  | 'unsigned'
  | 'signed'
  | 'hex'
  | 'decimal'
  | 'bitfield'
  | 'boolean'
  | 'scaled';

export interface ParserRule {
  id: string;
  name: string;
  rxId: string;
  matchCondition?: { byteIndex: number; value: string }[];
  startByte: number;
  byteLength: number;
  endianness: Endianness;
  interpretation: InterpretationType;
  scale: number;
  offset: number;
  unit: string;
  displayName: string;
  pinned: boolean;
}

export interface ParsedValue {
  ruleId: string;
  displayName: string;
  rawBytes: string[];
  decimalResult: number;
  scaledResult: number;
  unit: string;
  timestamp: number;
  active: boolean;
}

export interface ConnectionStatus {
  backend: boolean;
  canInterface: boolean;
  lastActivity: number | null;
  txCount: number;
  rxCount: number;
}
