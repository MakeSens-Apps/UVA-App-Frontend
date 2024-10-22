import {
  ChangeDetectorRef,
  Component,
  ElementRef,
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
  timer: number = 60;
  phone: string | null = '';
  type;
  showError: boolean = false;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ref: ChangeDetectorRef,
    private service: SetupService,
    private alertController: AlertController
  ) {
    this.type = this.route.snapshot.paramMap.get('type');
    this.phone = this.route.snapshot.paramMap.get('phone');
  }

  @ViewChildren('otpInput') otpInputs!: QueryList<IonInput>;

  ngOnInit() {
    this.startTimer();
  }

  startTimer() {
    const interval = setInterval(() => {
      this.timer--;
      this.ref.detectChanges();
      if (this.timer === 0) {
        clearInterval(interval);
        this.ref.detectChanges();
      }
    }, 1000);
  }

  onOtpFocus(event: any, index: number) {
    this.otp[index] = '';
    event.target.value = '';
  }

  onOtpChange(event: any, index: number): void {
    const value = event.target.value;

    // Solo permitir dígitos y asegurarse de que no se ingrese más de un carácter
    if (value.length <= 1 && /^\d*$/.test(value)) {
      this.otp[index] = value; // Almacenar el valor en la posición correcta

      // Si hay valor y no estamos en el último campo, mover al siguiente input
      if (value !== '' && index < this.otp.length - 1) {
        const nextInput = this.otpInputs.toArray()[index + 1];
        if (nextInput) {
          nextInput.setFocus();
        }
      }
      if (index === this.otp.length - 1) {
        // Si estamos en el último campo, enviar el formulario
        this.validateForm();
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

  resetTime() {
    switch(this.type){
      case 'login':
        this.service.reSendCodeSignIn();
        break;
    case 'register':
        this.service.reSendCodeSignUp();
      break;
    default :
      break
    }
    
    this.timer = 60;
    this.startTimer();
  }

  validateForm() {
    console.log('Formulario enviado:', this.otp.join(''));
    const otpValue = this.otp.join('');
    console.log(otpValue);
    if (otpValue.length === 6) {
      switch(this.type){
        case 'login':
          this.service.confirmSignIn(otpValue).then(response =>{
            if(response == false){
              this.showError = true;
              this.ref.detectChanges();
              return
            }
            this.router.navigate([`/home`]);
          });
          break;
        case 'register':
          this.service.confirmSignUp(otpValue).then(response =>{
            if(response == false){
              this.showError = true;
              this.ref.detectChanges();
              return
            }
            console.log('Creando nuevo usaurio');
            this.service.createNewUser().then(isCreatedUser => {
              if(isCreatedUser){
                this.router.navigate([`/otp/${this.type}/${this.phone}/validate-code`]);
              }
              else{
                this.alertController.create({
                  header: 'Alerta',
                  subHeader: 'Este es un subtítulo',
                  message: 'Este es un mensaje de alerta.',
                  buttons: ['Aceptar'] // O puedes usar un array de botones personalizados
                }).then(alert =>{
                  alert.present();
                });
              
              }
            });
          });
          break;
        default:
          console.error("NO SE MAPEA EL TIPO DE OTP DE ESTA VISTA");
          break
      }
      
      
    } else {
      this.showError = false;
    }
  }

  goToHome() {
    this.router.navigate(['/login']);
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}
