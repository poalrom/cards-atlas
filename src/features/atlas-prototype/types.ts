// Throwaway UI prototype: the selected spatial atlas design.
export type GroupId = 'counter' | 'removal' | 'draw' | 'ramp' | 'mill' | 'graveyard' | 'other';
export type CompareMode = 'counter' | 'draw' | 'both';
export interface AtlasSearch {
  group: GroupId | 'all';
  card?: string;
  compare?: CompareMode;
  asOf: string;
}
export interface MechanicGroup {
  id: GroupId;
  name: string;
  short: string;
  description: string;
  color: string;
  x: number;
  y: number;
}
export interface DemoCard {
  id: string;
  name: string;
  mana: string[];
  type: string;
  text: string;
  groups: GroupId[];
  effects: string[];
  art?: string;
  artist?: string;
  target?: 'any' | 'noncreature' | 'creature';
  condition?: string;
  sideEffect?: string;
  modal?: boolean;
  incomplete?: boolean;
}
export interface Comparison {
  card: DemoCard;
  coverage: 'full' | 'partial' | 'none';
  label: string;
  explanation: string;
  manaDelta: number;
}
export interface AtlasViewProps {
  state: AtlasSearch;
  selected: DemoCard | undefined;
  group: MechanicGroup | undefined;
  comparisons: Comparison[];
  onGroup: (id: GroupId | 'all') => void;
  onCard: (id: string) => void;
  onCompare: (mode: CompareMode | undefined) => void;
  onCloseCard: () => void;
  onReset: () => void;
}
