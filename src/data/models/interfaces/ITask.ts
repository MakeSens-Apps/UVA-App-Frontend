/**
 * B04 — ITask interface
 * Ported from: src/app/Interfaces/ITask.ts
 * Classification: Reusable as-is
 * Changes: none (import path only)
 */

export interface ITask {
  name: string;
  id?: string;
  restrictions?: unknown;
  completed?: boolean;
  color?: string;
  icon?: string;
  flows?: string[];
  flowsComplete?: string[];
}
