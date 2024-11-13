interface Task {
  name: string;
  restrictions: Restrictions;
  flows: string[];
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

interface Flow {
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

interface Guide {
  name: string;
  icon: Icon;
  image: string;
  text: string;
  nextGuide: string | null;
}

interface Icon {
  enable: boolean;
  iconName: string;
  colorName: string;
  colorHex: string;
}

interface Measurement {
  name: string;
  sortName: string;
  icon: Icon;
  fields: number;
  unit: string;
  range: Range;
  style: Style;
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

interface Bonus {
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
