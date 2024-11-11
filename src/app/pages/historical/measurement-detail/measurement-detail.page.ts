import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCheckbox,
  IonLabel,
  IonIcon,
  IonButton,
  ModalController,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '@app/components/header/header.component';
import { ActivatedRoute } from '@angular/router';
import { calendar } from '@app/components/calendar/calendar.component';
import { DayComponent } from '../../../components/calendar/day/day.component';
import { format, setDefaultOptions } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { AlertComponent } from '@app/components/alert/alert.component';
setDefaultOptions({ locale: es });

@Component({
  selector: 'app-measurement-detail',
  templateUrl: './measurement-detail.page.html',
  styleUrls: ['./measurement-detail.page.scss'],
  standalone: true,
  imports: [
    IonButton,
    IonIcon,
    IonLabel,
    IonCheckbox,
    IonTitle,
    IonToolbar,
    IonHeader,
    IonContent,
    HeaderComponent,
    CommonModule,
    FormsModule,
    DayComponent,
  ],
})
export class MeasurementDetailPage implements OnInit {
  date: calendar | undefined;
  dateFormatted: string | undefined;
  showAlert_incomplete = true;
  showAlert_complete_seed = false ;

  constructor(
    private route: ActivatedRoute,
    private modalCtrl: ModalController,
  ) {}

  ngOnInit(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.route.queryParams.subscribe((params: any) => {
      this.date = params;
      if (this.date?.date) {
        this.dateFormatted = format(
          new Date(this.date.date),
          "EEEE d 'de' MMMM, yyyy",
        );
      }
    });
  }
  async openModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AlertComponent,
      componentProps: {
        content: `
        <h2 style="color:  var(--Colors-Blue-900);"> Recupera tu racha pagando: </h2>
        <h2> <span>5</span>  <img src="../../../../assets/images/icons/semilla.svg" alt="seed" style="width: 100px; height: 100px; margin: 10px 0;"></h2>
        <p> ¿Quieres pagar 5 semillas para recuperar tu racha?</p>
        `
        ,
        textCancelButton: 'omitir',
        textOkButton: 'Pagar',
        reverseButton : true,
        bordersInCancelBtn : false,
        colorBtn:'uva_blue-600'
      },
      cssClass: 'custom-modal_recover-series',
      backdropDismiss: false,
    });

    // Recibir la respuesta del modal
    modal
      .onDidDismiss()
      .then(async (data) => {
        if (data.data.action === 'OK') {
          if (this.date) {
            this.date = { ...this.date, state: 'complete' };
            this.showAlert_complete_seed = true;
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });

    await modal.present();
  }
}
