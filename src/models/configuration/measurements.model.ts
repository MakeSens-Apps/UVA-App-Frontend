import { SafeHtml } from '@angular/platform-browser';

export interface Task {
  name: string;
  restrictions: Restrictions;
  flows: string[];
  id?: string;
}

interface Restrictions {
  activeDays: ActiveDays;
  activeTime: ActiveTime;
  activeDuration: ActiveDuration;
  requiredTask: RequiredTask;
}

interface ActiveDays {
  enabled: boolean;
  days: string[] | null;
}

interface ActiveTime {
  enabled: boolean;
  start: string;
  end: string;
}

interface ActiveDuration {
  enabled: boolean;
  duration: number | null;
}

interface RequiredTask {
  enabled: boolean;
  taskID: string | null;
}

export interface Flow {
  name: string;
  text: string;
  guides: string[];
  measurements: string[];
  restrictions?: Record<string, FlowRestriction>;
  nextFlow: string | null;
}

interface FlowRestriction {
  enabled: boolean;
  measurementIds: string[];
  message: string;
  validationFunction: string;
}

export interface Guide {
  name: SafeHtml;
  icon: Icon;
  image: string;
  text: string;
  nextGuide: string | null;
  showAutomatic?: boolean;
}

interface Icon {
  enable: boolean;
  name: string;
  colorName: string;
  colorHex: string;
  imagePath: string | null;
}

export interface Measurement {
  name: SafeHtml;
  sortName: SafeHtml;
  icon: Icon;
  fields: number;
  unit: string;
  range: Range;
  style: Style;
  fieldsArray?: string[];
  value?: number;
  id?: string | number | symbol;
  showRestrictionAlert?: boolean;
  textRestrictionAlert?: string;
}

interface Range {
  min: number;
  max: number;
  optionalMessage: string;
}

interface Style {
  backgroundColor: Color;
  borderColor: Color;
}

interface Color {
  colorName: string;
  colorHex: string;
}

interface Historical {
  name: string;
  symbol: string;
  unit: string;
  measurementIds: string[];
  aggregationFunction: string;
  style: Style;
  graph: Graph;
}

interface Graph {
  type: string;
  measurementIds: string[];
  aggregationFunction: string;
  style: Style;
}

export interface Bonus {
  schedule: {
    daysOfWeek: string[];
    occurrences: string[];
  };
  months: number[];
  message: string;
  seedReward: number;
}

export interface MeasurementModel {
  tasks: Record<string, Task>;
  flows: Record<string, Flow>;
  guides: Record<string, Guide>;
  measurements: Record<string, Measurement>;
  bonus: Record<string, Bonus>;
  historical: Historical[];
}
