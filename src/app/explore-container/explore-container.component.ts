import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader,
  IonTitle,
  IonToolbar,
  IonInput,
  IonLabel,
} from '@ionic/angular/standalone';
@Component({
  selector: 'app-explore-container',
  templateUrl: './explore-container.component.html',
  styleUrls: ['./explore-container.component.scss'],
  imports: [
    CommonModule,
    IonicModule,
    IonInput,
    IonHeader,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
    IonLabel,
  ],
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
