import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import {
  IonImg,
  IonIcon,
  IonCheckbox,
  IonButton,
  ModalController,
} from '@ionic/angular/standalone';
import { Guide } from 'src/models/configuration/measurements.model';
import { SafeHtmlPipe } from '@app/core/pipes/safe-html.pipe';
/**
 * Component for displaying guide measurements.
 * Handles displaying guide content, with optional HTML text or array text,
 * and provides functionality to close the modal, potentially passing the next guide.
 * @class GuideMeasurementComponent
 */
@Component({
  selector: 'app-guide-measurement',
  templateUrl: './guide-measurement.component.html',
  styleUrls: ['./guide-measurement.component.scss'],
  standalone: true,
  imports: [
    IonIcon,
    IonImg,
    IonCheckbox,
    IonButton,
    CommonModule,
    SafeHtmlPipe,
  ],
})
export class GuideMeasurementComponent implements OnInit {
  /**
   * The guide data to be displayed in the component.
   * This input is expected to contain content that might be text or HTML.
   * @type {Guide | undefined}
   */
  @Input() guide: Guide | undefined;

  /**
   * Flag indicating whether the guide text should be treated as HTML.
   * Default is false, meaning the text will be treated as plain text.
   * @type {boolean}
   */
  @Input() isHtmlText = false;

  /**
   * Flag to check if the guide text is an array.
   * Set to true if the guide's text is an array.
   * @type {boolean}
   */
  IsArrayText = false;

  img: string | null = '';

  text = '';

  /**
   * Creates an instance of the GuideMeasurementComponent.
   * @param {ModalController} modalCtrl - The ModalController to manage modal actions.
   * @param {ConfigurationAppService} configuration - Service to get configuration App.
   */
  constructor(
    private modalCtrl: ModalController,
    private configuration: ConfigurationAppService,
  ) {}

  /**
   * Lifecycle hook that runs when the component is initialized.
   * It checks if the guide text is an array and updates the flag accordingly.
   * @returns {void}
   */
  async ngOnInit(): Promise<void> {
    if (Array.isArray(this.guide?.text)) {
      this.IsArrayText = true;
    }
    if (this.guide) {
      this.img = await this.configuration.loadImage(this.guide.image);
      if (this.guide.icon.imagePath) {
        this.guide.icon.imagePath = await this.configuration.loadImage(
          this.guide.icon.imagePath as string,
        );
      }
      if (this.isHtmlText) {
        this.text = this.guide.text;
      }
    }
  }

  /**
   * Closes the modal, and optionally dismisses it with the next guide data.
   * @param {boolean} isButtonOk - Flag to determine whether to pass the next guide data upon closing.
   * @returns {Promise<void>} - A promise that resolves when the modal is closed.
   */
  async closeModal(isButtonOk = false): Promise<void> {
    if (isButtonOk) {
      await this.modalCtrl.dismiss({ nextGuide: this.guide?.nextGuide });
    }
    await this.modalCtrl.dismiss();
  }
}
