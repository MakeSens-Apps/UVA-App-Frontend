import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-explore-container',
  templateUrl: './explore-container.component.html',
  styleUrls: ['./explore-container.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  standalone: true,
})
export class ExploreContainerComponent {
  @Input() title?: string;
  @Input() titleHTML?: string;
  @Input() subTitle?: string;
  @Input() message?: string;
  @Input() BgBlue?: boolean = false;
  @Input() Icon?: string;
}
