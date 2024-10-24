import {
  ChangeDetectorRef,
  Component,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { AlertController } from '@ionic/angular';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonLabel,
  IonTitle,
  IonToolbar,
  IonInput,
  IonButton,
} from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SetupService } from '@app/core/services/view/setup/setup.service';
@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
  standalone: true,
  imports: [
    IonButton,
    IonInput,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    ExploreContainerComponent,
    IonLabel,
    RouterLink,
  ],
})
export class OtpPage implements OnInit {
  otp: string[] = ['', '', '', '', '', ''];
  timer = 60;
  phone: string | null = '';
  type;
  showError = false;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ref: ChangeDetectorRef,
    private service: SetupService,
    private alertController: AlertController,
  ) {
    this.type = this.route.snapshot.paramMap.get('type');
    this.phone = this.route.snapshot.paramMap.get('phone');
  }

  @ViewChildren('otpInput') otpInputs!: QueryList<IonInput>;

  ngOnInit(): void {
    this.startTimer();
  }

  startTimer(): void {
    const interval = setInterval(() => {
      this.timer--;
      this.ref.detectChanges();
      if (this.timer === 0) {
        clearInterval(interval);
        this.ref.detectChanges();
      }
    }, 1000);
  }

  onOtpFocus(event: Event, index: number): void {
    this.otp[index] = '';
    (event.target as HTMLInputElement).value = '';
  }

  onOtpChange(event: Event, index: number): void {
    const value = (event.target as HTMLInputElement).value;

    // Solo permitir dígitos y asegurarse de que no se ingrese más de un carácter
    if (value.length <= 1 && /^\d*$/.test(value)) {
      this.otp[index] = value; // Almacenar el valor en la posición correcta

      // Si hay valor y no estamos en el último campo, mover al siguiente input
      if (value !== '' && index < this.otp.length - 1) {
        const nextInput = this.otpInputs.toArray()[index + 1];
        if (nextInput) {
          void nextInput.setFocus();
        }
      }
      if (index === this.otp.length - 1) {
        // Si estamos en el último campo, enviar el formulario
        void this.validateForm();
      }
    } else {
      // Si el valor no es válido, vaciar el input
      this.otp[index] = '';
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  async resetTime(): Promise<void> {
    switch (this.type) {
      case 'login':
        await this.service.reSendCodeSignIn();
        break;
      case 'register':
        await this.service.reSendCodeSignUp();
        break;
      default:
        break;
    }

    this.timer = 60;
    this.startTimer();
  }

  async validateForm(): Promise<void> {
    const otpValue = this.otp.join('');
    if (otpValue.length === 6) {
      switch (this.type) {
        case 'login': {
          const responseLogin = await this.service.confirmSignIn(otpValue);
          if (responseLogin == false) {
            this.showError = true;
            this.ref.detectChanges();
            return;
          }
          await this.router.navigate([`/home`]);
          break;
        }
        case 'register':
          {
            const responseRegister = await this.service.confirmSignUp(otpValue);
            if (responseRegister == false) {
              this.showError = true;
              this.ref.detectChanges();
              return;
            }
            const responseNewUser = await this.service.createNewUser();
            if (responseNewUser) {
              await this.router.navigate([
                `/otp/${this.type}/${this.phone}/validate-code`,
              ]);
            } else {
              //FIXME: Hay que desplegar una alerta real en relacion a la no creacion del usuario y manejar el error
              await this.alertController
                .create({
                  header: 'Alerta',
                  subHeader: 'Este es un subtítulo',
                  message: 'Este es un mensaje de alerta.',
                  buttons: ['Aceptar'], // O puedes usar un array de botones personalizados
                })
                .then((alert) => {
                  void alert.present();
                });
            }
          }

          break;
        default:
          console.error('NO SE MAPEA EL TIPO DE OTP DE ESTA VISTA');
          break;
      }
    } else {
      this.showError = false;
    }
  }

  goToHome(): void {
    void this.router.navigate(['/login']);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
