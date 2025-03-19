export interface ITask {
  name: string;
  id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  restrictions?: any;
  completed?: boolean;
  color?: string;
  icon?: string;
  flows?: string[];
  flowsComplete?: string[];
}
