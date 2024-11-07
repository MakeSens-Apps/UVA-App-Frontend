import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';

/**
 * @class MoonCardComponent
 * @description A component that represents a card displaying moon-related information.
 */
@Component({
  selector: 'app-moon-card',
  templateUrl: './moon-card.component.html',
  styleUrls: ['./moon-card.component.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class MoonCardComponent {
  /**
   * @constructs
   * Creates an instance of MoonCardComponent.
   */
  constructor() {}
}
