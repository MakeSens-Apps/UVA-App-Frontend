import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

// eslint-disable-next-line @typescript-eslint/naming-convention
const LUNAR_PHASE = {
  NEW_MOON: '../../../assets/images/Moon/nueva.svg',
  FIRST_QUARTER: '../../../assets/images/Moon/cuarto_creceiente.svg',
  WANING_GIBBOUS: '../../../assets/images/Moon/gibosa_menguante.svg',
  FULL_MOON: '../../../assets/images/Moon/llena.svg',
  WANING_CRESCENT: '../../../assets/images/Moon/gibosa_creciente.svg',
  LAST_QUARTER: '../../../assets/images/Moon/cuarto_menguante.svg',
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const LUNAR_PHASE_NAME = {
  NEW_MOON: 'Luna nueva',
  FIRST_QUARTER: 'Cuarto crescente',
  WANING_GIBBOUS: 'Menguante gibosa',
  FULL_MOON: 'Luna llena',
  LAST_QUARTER: 'Cuarto menguante',
  WANING_CRESCENT: 'Menguante crescente',
};

/**
 * @class MoonCardComponent
 * @description A component that displays information about the current lunar phase, including its icon and name.
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
   * Specifies the background color of the moon card, either 'gray' or 'green'.
   * @type {'gray' | 'green'}
   */
  @Input() background: 'gray' | 'green' = 'gray';

  /**
   * Holds the current lunar phase key.
   * @private
   * @type {keyof typeof LUNAR_PHASE}
   */
  _phase: keyof typeof LUNAR_PHASE = 'FULL_MOON';

  /**
   * Sets the current lunar phase, updating the associated name and icon accordingly.
   * @param {keyof typeof LUNAR_PHASE} _phase - The lunar phase to set.
   */
  @Input() set phase(_phase: keyof typeof LUNAR_PHASE) {
    this._phase = _phase ? _phase : 'NEW_MOON';
    this.phaseName = LUNAR_PHASE_NAME[_phase];
    this.phaseIcon = LUNAR_PHASE[_phase];
  }
  // = 'LAST_QUARTER';}
  /**
   * Holds the display name of the current lunar phase.
   * @type {string}
   */
  @Input() phaseName = LUNAR_PHASE_NAME[this._phase];

  /**
   * Holds the path to the icon of the current lunar phase.
   * @type {string}
   */
  @Input() phaseIcon = LUNAR_PHASE[this._phase];

  /**
   * toggle for arrow icon .
   * @type {boolean}
   */
  @Input() hasArrow = true;

  /**
   * Creates an instance of MoonCardComponent.
   * @constructs MoonCardComponent
   */
  constructor() {}
}
