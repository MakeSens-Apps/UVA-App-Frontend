import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonLabel, IonTitle, IonToolbar, IonInput, IonButton } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
  standalone: true,
  imports: [IonButton, IonInput, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,ExploreContainerComponent, IonLabel, RouterLink]
})
export class OtpPage implements OnInit {
  otp: string[] = ['', '', '', ''];
  timer: number = 60;
  phoneNumber: string = '318 522 8374';
  type
  showError: boolean = false;
  constructor(private router : Router, private route : ActivatedRoute) { 
    this.type = this.route.snapshot.paramMap.get('type');
  }
  
  @ViewChildren('otpInput') otpInputs!: QueryList<IonInput>;

  ngOnInit() {
    this.startTimer();
  }

  startTimer() {
    const interval = setInterval(() => {
      this.timer--;
      if (this.timer === 0) {
        clearInterval(interval);
      }
    }, 1000);
  }

  onOtpChange(event: any, index: number): void {
    const value = event.target.value;

    // Solo permitir dígitos y asegurarse de que no se ingrese más de un carácter
    if (value.length <= 1 && /^\d*$/.test(value)) {
      this.otp[index] = value;  // Almacenar el valor en la posición correcta

      // Si hay valor y no estamos en el último campo, mover al siguiente input
      if (value !== '' && index < this.otp.length - 1) {
        const nextInput = this.otpInputs.toArray()[index + 1];
        if (nextInput) {
          nextInput.setFocus();
        }
      }
      if (index === this.otp.length - 1) {
        // Si estamos en el último campo, enviar el formulario
        this.validateForm()
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

  resetTime(){
    this.timer = 60
    this.startTimer();
  }


  validateForm(){
    console.log('Formulario enviado:', this.otp.join(''));
    const otpValue = this.otp.join('');
    if(otpValue.length === 4){

      // FIXME: Remove verification
      if (otpValue == '0000') {
        this.showError = true;
        // this.otp = ['', '', '', ''];
        return
      }
      // Aquí puedes enviar el formulario o realizar otras acciones
      console.log('Formulario válido');
      this.router.navigate([`/otp/${this.type}/validate-code`]);
    } else {
      this.showError = false;
    }

  }

  goToHome(){
    this.router.navigate(['/login']);
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}


