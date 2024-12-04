import { Injectable } from '@angular/core';
import { ITask } from '@app/Interfaces/ITask';

@Injectable({
  providedIn: 'root',
})
export class MeasurementService {
  data = data;

  /**
   * Creates an instance of the MeasurementService.
   */
  constructor() {}

  /**
   * Calculates the overall progress of tasks based on their completion status.
   * The progress is expressed as a percentage.
   * @returns {number} - The percentage of completed tasks.
   */
  getProgress(): number {
    const keysTask = Object.keys(this.data.tasks);
    if (keysTask.length === 0) {
      return 0;
    }
    let taskComplete = 0;

    keysTask.forEach((key) => {
      const keyName = key as keyof typeof this.data.tasks;
      const task: ITask = this.data.tasks[keyName];
      if (task.completed) {
        taskComplete += 1;
      }
    });

    const progress = (taskComplete / keysTask.length) * 100;
    return progress;
  }

  /**
   * Marks a specific flow as completed for a given task.
   * If all flows associated with a task are completed, the task is marked as completed.
   * @param {keyof typeof this.data.tasks} taskId - The ID of the task to be updated.
   * @param {keyof typeof this.data.flows} flowId - The ID of the flow to be marked as completed.
   */
  setFlowCompleted(
    taskId: keyof typeof this.data.tasks,
    flowId: keyof typeof this.data.flows,
  ): void {
    const task: ITask = this.data.tasks[taskId];
    if (!task?.flows || !task.flows.includes(flowId)) {
      return;
    }

    if (task.flowsComplete) {
      if (task.flowsComplete.includes(flowId)) {
        return;
      }
      task.flowsComplete.push(flowId);
    } else {
      task.flowsComplete = [flowId];
    }
    if (task.flowsComplete.length === task.flows?.length) {
      task.completed = true;
    }
  }
}
