import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonIcon,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-sync-action',
  templateUrl: './sync-action.component.html',
  styleUrls: ['./sync-action.component.scss'],
  imports: [IonButton, IonLabel, IonIcon, IonList, CommonModule],
  standalone: true,
})
export class SyncActionComponent {
  // Recibe los datos necesarios como inputs
  @Input() isInfoPending = false; // Determina si hay información pendiente
  @Input() infoPendingText = ''; // Texto cuando hay información pendiente
  @Input() noInfoPendingText = ''; // Texto cuando no hay información pendiente
  @Input() title = ''; // Título que se muestra
  @Input() buttonText = ''; // Texto del botón

  // Emite un evento de clic
  @Output() clickSync: EventEmitter<void> = new EventEmitter<void>();

  /**
   * ClickEvent
   */
  onClick(): void {
    this.clickSync.emit();
  }
}
