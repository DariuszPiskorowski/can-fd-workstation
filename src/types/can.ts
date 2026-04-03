export type SendMode = 'one-shot' | 'cyclic';

export type CanInterface = 'can0' | 'can1';

export type MessageCategory = 'Diagnostics' | 'Control' | 'Read requests' | 'Test sequences' | 'Custom' | 'Conditional Sequence';

export interface SequenceStep {
  txId: string;
  dlc: number;
  dataBytes: string[];
  canInterface: CanInterface;
  isFd?: boolean;
  bitrateSwitch?: boolean;
}

export interface ConditionalStep {
  id: string;
  enabled: boolean;
  txId: string;
  dlc: number;
  dataBytes: string[];
  canInterface: CanInterface;
  rxId: string; // CAN ID to match for expected response
  expectedResponseStart: string[]; // 8 bytes prefix match
  repeatIntervalMs: number;
  maxRepeats: number;
  timeoutAfterLastRepeatMs: number;
  isExtendedId?: boolean;
  isFd?: boolean;
  bitrateSwitch?: boolean;
}

export type ConditionalSequenceStatus = 'idle' | 'running' | 'success' | 'failed';

export interface ConditionalSequenceState {
  status: ConditionalSequenceStatus;
  currentStep: number;
  repeatsUsed: number;
  lastRxSeen: string[] | null;
  matched: boolean;
  failReason?: string;
}

export interface FinalSuccessMessage {
  enabled: boolean;
  txId: string;
  dlc: number;
  dataBytes: string[];
  canInterface: CanInterface;
}

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
  canInterface: CanInterface;
  isExtendedId?: boolean;
  isFd?: boolean;
  bitrateSwitch?: boolean;
  notes?: string;
  sequenceSteps?: SequenceStep[];
  sequenceDelayMs?: number;
  // Conditional Sequence fields
  conditionalSteps?: ConditionalStep[];
  finalOnSuccess?: FinalSuccessMessage;
  conditionalState?: ConditionalSequenceState;
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
  canInterface: CanInterface;
  isExtendedId?: boolean;
  isFd?: boolean;
  bitrateSwitch?: boolean;
  status?: string;
  notes?: string;
  parserMatched?: boolean;
  // Sequence annotation
  seqAnnotation?: string;
}

export type Endianness = 'big' | 'little';
export type InterpretationType =
  | 'unsigned'
  | 'signed'
  | 'hex'
  | 'decimal'
  | 'bitfield'
  | 'boolean'
  | 'scaled'
  | 'ascii';

export interface ParserRule {
  id: string;
  name: string;
  rxId: string;
  rxInterface?: CanInterface;
  matchConditionEnabled?: boolean;
  matchConditionBytes?: string[]; // 8 bytes, 'XX' = wildcard
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
  asciiResult?: string;
  unit: string;
  timestamp: number;
  active: boolean;
}

export interface ConnectionStatus {
  backend: boolean;
  can0: boolean;
  can1: boolean;
  lastActivity: number | null;
  txCount: number;
  rxCount: number;
}
