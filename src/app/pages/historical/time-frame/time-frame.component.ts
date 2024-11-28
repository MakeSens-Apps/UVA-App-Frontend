import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TimeFrame } from '../historical.model';
import {
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-time-frame',
  templateUrl: './time-frame.component.html',
  styleUrls: ['./time-frame.component.scss'],
  standalone: true,
  imports: [IonSegment, IonSegmentButton, IonLabel, FormsModule],
})
export class TimeFrameComponent {
  @Input() timeFrame: TimeFrame = 'month';
  @Output() segmentChange = new EventEmitter<TimeFrame>();

  constructor() {}
  changeSegment(value: TimeFrame): void {
    this.segmentChange.emit(value);
  }
  onSegmentChange(): void {
    this.segmentChange.emit(this.timeFrame);
  }
}
