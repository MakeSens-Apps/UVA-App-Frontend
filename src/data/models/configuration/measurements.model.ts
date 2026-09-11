/**
 * B04 — MeasurementModel
 * Ported from: src/models/configuration/measurements.model.ts
 * Classification: Reusable as-is
 * Changes: none (import path only)
 *
 * NOTE: FlowRestriction.validationFunction is PRESERVED as-is (not exercised).
 * Per portability-matrix §4.4 and plan.md B07: the UI uses the fixed operator
 * '0:>:1' via validateRestriction in domain/measurement-engine (B07).
 * validationFunction is documented as ignored until a product decision changes it (R-35).
 */

export interface Task {
  name: string;
  restrictions: Restrictions;
  flows: string[];
  id?: string;
  /**
   * List of flow IDs already completed for this task (from ITask.flowsComplete).
   * Used by MeasurementScreen.goToRegister to find the first incomplete flow.
   * Original: measurement.page.ts:397 — task.flowsComplete?.includes(flow).
   * Mirrored from ITask.ts (src/app/Interfaces/ITask.ts:10).
   */
  flowsComplete?: string[];
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
  name: string;
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
  name: string;
  sortName: string;
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

export interface Historical {
  name: string;
  symbol: string;
  unit: string;
  measurementIds: string[];
  aggregationFunction: string;
  style: Style;
  graph: Graph;
  value?: number;
  selected?: boolean;
  min?: number;
  max?: number;
  avg?: number;
}

export interface Graph {
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
