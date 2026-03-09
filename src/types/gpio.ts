export interface GpioTarget {
  name: string;
  chip: string;
  line: number;
  available: boolean;
  state: number | null;
}

export interface GpioSwitch {
  id: string;
  label: string;
  target: string;
  state: number;
}
