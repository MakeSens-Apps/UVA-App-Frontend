/* eslint-disable @typescript-eslint/no-explicit-any */
import { GuideMeasurementComponent } from './../guide-measurement/guide-measurement.component';
import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonIcon,
  ModalController,
  IonInput,
  IonButton,
  IonModal,
  IonImg,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '@app/components/header/header.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { Flow, Measurement } from 'src/models/configuration/measurements.model';

import { DomSanitizer } from '@angular/platform-browser';

import { Preferences } from '@capacitor/preferences';
import { MeasurementDSService } from '@app/core/services/storage/datastore/measurement-ds.service';

const operaciones: Record<
  string,
  (a: number, b: number) => number | undefined
> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => (b !== 0 ? a / b : undefined), // Verifica división por cero
  '<': (a, b) => (a < b ? 1 : 0), // Devuelve 1 si a es menor que b, de lo contrario 0
  '>': (a, b) => (a > b ? 1 : 0), // Devuelve 1 si a es mayor que b, de lo contrario 0
  '=': (a, b) => (a === b ? 1 : 0), // Devuelve 1 si a es igual a b, de lo contrario 0
  // Agrega más operadores según sea necesario
};

@Component({
  selector: 'app-register-measurement',
  templateUrl: './register-measurement.page.html',
  styleUrls: ['./register-measurement.page.scss'],
  standalone: true,
  imports: [
    IonImg,
    IonModal,
    IonButton,
    IonInput,
    IonContent,
    CommonModule,
    HeaderComponent,
    IonIcon,
    IonButton,
  ],
})
export class RegisterMeasurementPage implements OnInit, OnDestroy {
  /** Stores the input digits for the measurements. */
  digits: string[] = ['', ''];

  /** QueryList to manage the digit input elements dynamically. */
  @ViewChildren('digitsInput') digitsInputs!: QueryList<IonInput>;

  /** Input property to receive the current flow configuration. */
  @Input() flow: Flow | undefined;

  /** Input property for the current task identifier. */
  @Input() taskId: string | number | symbol | undefined;

  /** Identifier for the current flow. */
  flowId: string | number | symbol | undefined;

  /** List of measurements configured in the current flow. */
  measurement: Measurement[] | undefined;

  /** Raw data retrieved from configuration storage. */
  data: any;

  /** Indicates if the current flow has associated guides. */
  hasGuide = false;

  /** Flag to control the modal visibility after saving measurements. */
  OpenModalRegisterOk = false;

  /** Stores the configuration data for measurements. */
  configurationMeasurement: any;

  applyBlurFilter = false;

  @ViewChild('modal_modal_confirmation') modal_modal_confirmation!: IonModal;
  @ViewChild('modal_register_Ok') modal_register_Ok!: IonModal;

  /**
   * Creates an instance of RegisterMeasurementPage and injects the required dependencies.
   * @param {ModalController} modalCtrl - Service to manage Ionic modals.
   * @param {ActivatedRoute} route - Service to manage and access route parameters.
   * @param {Router} router - Service for programmatic navigation.
   * @param {ConfigurationAppService} configuration - Service to fetch and manage app configurations.
   * @param {DomSanitizer} sanitizer - Service to sanitizer html code on view.
   */
  constructor(
    private modalCtrl: ModalController,
    private route: ActivatedRoute,
    private router: Router,
    private configuration: ConfigurationAppService,
    private sanitizer: DomSanitizer,
  ) {}

  /**
   * Initializes the component, fetching the measurement configuration and processing query parameters.
   * @returns {Promise<void>}
   */
  async ngOnInit(): Promise<void> {
    this.configurationMeasurement =
      await this.configuration.getConfigurationMeasurement();

    this.data = this.configurationMeasurement;

    this.route.queryParams.subscribe((params: any) => {
      const flowId: keyof typeof this.configurationMeasurement.flows =
        params.flowId;
      this.taskId = params.taskId;

      if (flowId) {
        this.flowId = flowId;
        this.flow = this.data.flows[flowId as string]; // || data.flows.flow1;

        if (this.flow) {
          this.measurement = this.flow?.measurements.map((measurement: any) => {
            const key = measurement as keyof typeof this.data.measurements;
            const measurementComplete: Measurement =
              this.data.measurements[key];
            measurementComplete.id = key;
            measurementComplete.showRestrictionAlert = false;
            measurementComplete.name = this.sanitizer.bypassSecurityTrustHtml(
              measurementComplete.name as string,
            );
            (async () => {
              if (measurementComplete.icon.imagePath) {
                measurementComplete.icon.imagePath =
                  await this.configuration.loadImage(
                    measurementComplete.icon.imagePath,
                  );
              }
            })().catch((err) => {
              console.error(
                '🚀 ~ RegisterMeasurementPage ~ error obteniendo imagen icon:',
                err,
              );
            });
            const numberFields = measurementComplete.fields || 0;
            measurementComplete.fieldsArray = Array.from({
              length: numberFields,
            });
            return measurementComplete;
          });
          if (this.flow.guides.length) {
            this.hasGuide = true;
            this.data.guides[this.flow.guides[0]].showAutomatic = true;
            if (this.data.guides[this.flow.guides[0]].showAutomatic) {
              this.OpenGuide(this.flow.guides[0]).catch((err) =>
                console.error(err),
              );
            }
          }
        }
      }
    });
  }

  /**
   * Cleanup logic when the component is destroyed.
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.OpenModalRegisterOk = false;
  }

  /**
   * Opens a modal for a specific guide.
   * @param {string} _guide - Identifier of the guide to open.
   * @returns {Promise<void>}
   */
  async OpenGuide(_guide: string): Promise<void> {
    if (Object.keys(this.data.guides).includes(_guide)) {
      const guide: keyof typeof this.data.guides =
        _guide as keyof typeof this.data.guides;

      this.modalCtrl
        .create({
          component: GuideMeasurementComponent,
          componentProps: {
            guide: this.data.guides[guide || 'guide1'],
            isHtmlText: true,
          },
          cssClass: 'modal-fullscreen',
          backdropDismiss: true,
          canDismiss: true,
          initialBreakpoint: 1,
          breakpoints: [0, 1],
        })
        .then(async (modal) => {
          await modal.present();
          const { data } = await modal.onDidDismiss();
          if (data?.nextGuide) {
            const nextGuide = data.nextGuide;
            await this.OpenGuide(nextGuide);
          }
        })
        .catch((err) => console.error(err));
    }
  }

  /**
   * Handles focus events on digit inputs, resetting the value and clearing alerts.
   * @param {Event} event - The focus event.
   * @param {number} index - Index of the input field.
   * @param {number} measurementIndex - Index of the measurement.
   * @returns {void}
   */
  onDigitsFocus(event: Event, index: number, measurementIndex: number): void {
    if (this.measurement) {
      if (this.measurement[measurementIndex]) {
        if (this.measurement[measurementIndex].fieldsArray) {
          this.measurement[measurementIndex].fieldsArray[index] = '';
          (event.target as HTMLInputElement).value = '';
        }
        this.measurement[measurementIndex].showRestrictionAlert = false;
      }
    }
  }

  /**
   * Handles changes in digit inputs, ensuring valid input and managing focus for the next field.
   * @param {Event} Event - The input event.
   * @param {number} i - Index of the input field.
   * @param {number} measurementIndex - Index of the measurement.
   * @returns {void}
   */
  onDigitsChange(Event: Event, i: number, measurementIndex: number): void {
    const inputValue = (Event.target as HTMLInputElement).value;

    // Si el valor está completo (es decir, tiene un solo dígito en este caso)
    if (
      inputValue &&
      inputValue.length === 1 &&
      inputValue.length <= 1 &&
      /^\d*$/.test(inputValue)
    ) {
      // Obtenemos el siguiente índice
      const nextIndex = i + 1;

      // Verificamos si existe un siguiente campo
      if (this.measurement) {
        if (this.measurement[measurementIndex]) {
          if (this.measurement[measurementIndex].fieldsArray) {
            this.measurement[measurementIndex].fieldsArray[i] = inputValue;
            if (
              nextIndex < this.measurement[measurementIndex].fieldsArray.length
            ) {
              // Construimos el id del siguiente campo de entrada

              const nextInputId = !this.applyBlurFilter
                ? `digitsInput_${measurementIndex}_${nextIndex}`
                : `digitsInput_${measurementIndex}_${nextIndex}_modal`;
              const nextInput = document.getElementById(
                nextInputId,
              ) as HTMLIonInputElement;

              // Enfocamos el siguiente campo si existe
              if (nextInput) {
                void nextInput.setFocus();
              }
            }
            this.measurement[measurementIndex].value = Number(
              this.measurement[measurementIndex].fieldsArray.join(''),
            );
          }
          this.measurement[measurementIndex].showRestrictionAlert = false;
        }
      }
    } else {
      (Event.target as HTMLInputElement).value = '';
    }
  }

  /**
   * Optimizes rendering in *ngFor by tracking items by index.
   * @param {number} index - The index of the element.
   * @returns {number} - The same index.
   */
  trackByIndex(index: number): number {
    return index;
  }

  /**
   * Saves the measurements, performs validations, and navigates to the next flow or completes the process.
   * @returns {Promise<void>}
   */
  async save(): Promise<void> {
    const measurementsWhitOutValue = this.measurement?.filter(
      (measurement: Measurement) => !measurement.value,
    );
    if (measurementsWhitOutValue?.length) {
      return;
    }
    const someMeasurementMinusRange =
      this.measurement?.some((measurement: Measurement) => {
        if (measurement.value) {
          if (measurement.range) {
            return (
              measurement.value < measurement.range.min ||
              measurement.value > measurement.range.max
            );
          } else {
            return false;
          }
        } else {
          return false;
        }
      }) || false;
    if (someMeasurementMinusRange) {
      return;
    }
    if (this.flow?.restrictions) {
      await this.validateRestriction();
    }

    this.OpenModalRegisterOk = true;
    const measurementDate = this.measurement?.reduce(
      (measurement, currentValue) => {
        if (!measurement) {
          measurement = {};
        }
        if (measurement && currentValue.id) {
          measurement[currentValue.id.toString()] = currentValue.value || 0;
        }
        return measurement;
      },
      {} as Record<string, number>,
    );

    if (this.taskId && this.flowId) {
      if (measurementDate) {
        await MeasurementDSService.addMeasurement(
          'RAW',
          measurementDate,
          {},
          new Date().toISOString(),
          this.taskId as string,
        ).then(async () => {
          await this.modal_modal_confirmation.dismiss();
          await this.goToNexFlowOrSavePreference();
        });
      }
    }
  }

  /**
   * Validates flow restrictions and displays alerts for violations.
   * @returns {Promise<void>}
   * @throws Will throw an error if a restriction is violated.
   */
  async validateRestriction(): Promise<void> {
    if (this.flow?.restrictions) {
      if (Object.keys(this.flow.restrictions)) {
        const flowRestrictions = this.flow?.restrictions;
        const lastMeasurementValues = await Preferences.get({
          key: 'lastMeasurementValues',
        });
        if (lastMeasurementValues.value) {
          const lastMeasurementValuesValue = JSON.parse(
            lastMeasurementValues.value,
          );
          if (this.flowId === lastMeasurementValuesValue[0].flow) {
            const restrictions: any[] = [];
            Object.keys(flowRestrictions).forEach((restriction) => {
              const restrictionValue = flowRestrictions[restriction];
              if (restrictionValue.enabled) {
                restrictions.push(restrictionValue);
              }
            });
            if (restrictions) {
              let valuesAllMeasuraments: any[] = [];
              if (this.measurement) {
                const valuesMeasurements = this.measurement.map(
                  (measurament) => {
                    return {
                      flow: this.flowId,
                      id: measurament.id,
                      value: measurament.value,
                    };
                  },
                );
                valuesAllMeasuraments = [
                  ...lastMeasurementValuesValue,
                  ...valuesMeasurements,
                ];
              }
              restrictions.map((restriction, index) => {
                const valuesForRestriction = (
                  restriction.measurementIds as string[]
                ).map((measurementId) => {
                  const valueRestriction = valuesAllMeasuraments.find(
                    (measurement) => {
                      return measurement.id === measurementId;
                    },
                  );
                  return valueRestriction.value;
                });

                /*TODO: Change values function for other with same this structure (this only work with 2 variables)
                  Function : [Position measurement0 part0 : signo part1 : Position measurement1 part2 ]
                  Note ' : ' is symbol to split tha function
                  Example : 0:>:1
                */

                const funcion = '0:>:1';
                const parts = funcion.split(':');
                console.error(
                  '🚀 ~ RegisterMeasurementPage ~ restrictions.map ~ Validation: ',
                  valuesForRestriction[Number(parts[0])],
                  parts[1],
                  valuesForRestriction[Number(parts[2])],
                );

                if (
                  !operaciones[parts[1]](
                    valuesForRestriction[Number(parts[0])],
                    valuesForRestriction[Number(parts[2])],
                  )
                ) {
                  const indexMeasuramentHasRestriction =
                    this.measurement?.findIndex((measurement) =>
                      restriction.measurementIds.includes(measurement.id),
                    );
                  if (
                    indexMeasuramentHasRestriction !== undefined &&
                    indexMeasuramentHasRestriction !== -1
                  ) {
                    if (this.measurement) {
                      this.measurement[
                        indexMeasuramentHasRestriction
                      ].showRestrictionAlert = true;
                      this.measurement[
                        indexMeasuramentHasRestriction
                      ].textRestrictionAlert = restriction.message;
                    }
                  }
                  throw new Error(
                    `⛔️❌📛 ~ RegisterMeasurementPage ~ restrictions.map restriction ${JSON.stringify(restriction)}, ${index}`,
                  );
                }
              });
            }
          }
        }
      }
    }
  }

  /**
   * Navigates to the next flow if available, or saves the current preferences and navigates to the home page.
   * @returns {Promise<void>}
   */
  async goToNexFlowOrSavePreference(): Promise<void> {
    if (!this.flow?.nextFlow) {
      await Preferences.remove({ key: 'lastMeasurementValues' });
      setTimeout(() => {
        this.modal_register_Ok.dismiss().catch((err) => {
          console.error(
            `⛔️❌📛 ~ RegisterMeasurementPage ~ error cerrando modal Register Ok ${err}`,
          );
        });
        this.OpenModalRegisterOk = false;
        this.router
          .navigate(['app/tabs/register'])
          .catch((error) => {
            console.error('Error al navegar a la página de inicio:', error);
          })
          .finally(() => {
            this.OpenModalRegisterOk = false;
          });
      }, 2000);
    } else {
      if (this.measurement) {
        const valuesMeasurements = this.measurement.map((measurament) => {
          return {
            flow: this.flow?.nextFlow,
            id: measurament.id,
            value: measurament.value,
          };
        });
        await Preferences.set({
          key: 'lastMeasurementValues',
          value: JSON.stringify(valuesMeasurements),
        });
      }
    }
  }

  /**
   * Navigates to the next measurement flow.
   * @returns {void}
   */
  goToComplete(): void {
    this.OpenModalRegisterOk = false;
    if (this.flow?.nextFlow) {
      this.router
        .navigate(['app/tabs/register/measurement-new'], {
          queryParams: {
            flowId: this.flow.nextFlow,
            taskId: this.taskId,
          },
        })
        .catch((error) => {
          console.error('Error al navegar a la página de Registros:', error);
        })
        .finally(() => {
          this.OpenModalRegisterOk = false;
        });
    }
  }
}
