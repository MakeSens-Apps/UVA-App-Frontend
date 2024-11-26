import { Component, Input } from '@angular/core';
import { IonProgressBar } from '@ionic/angular/standalone';

/**
 * @class ProgressBarComponent
 * @description A component that displays a progress bar, typically used to indicate loading or completion status.
 */
@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  standalone: true,
  imports: [IonProgressBar],
})
export class ProgressBarComponent {
  @Input() currentProgress = 0;

  @Input() totalProgress = 1;
  /**
   * @property {number} value - The current value of the progress bar, ranging from 0 to 1.
   */
  @Input() value = 0;
  @Input() totalTask = 0;
  @Input() completedTask = 0;

  /**
   * @constructs
   * Creates an instance of ProgressBarComponent.
   */
  constructor() {}
}
