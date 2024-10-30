import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonIcon, IonButtons, IonButton, IonCard, IonItem, IonToggle, IonLabel, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.page.html',
  styleUrls: ['./configuration.page.scss'],
  standalone: true,
  imports: [IonCardTitle, IonCardHeader, IonCardContent, IonLabel, IonToggle, IonItem, IonCard, IonButton, IonButtons, IonIcon, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class ConfigurationPage implements OnInit {
  isDisabled: boolean =true;
  isNotificationsActive: boolean = false;
  constructor(private router: Router) { }

  ngOnInit() { console.log("ini")}

  goBack(url:string) {
    this.router.navigate([url]);  
  }

  activeNoti(event: any) {
    //LOGICA PARA activar noti
    this.isNotificationsActive = event.detail.checked;
    console.log('Notificaciones activadas:', this.isNotificationsActive);
  }
  uploadData() {
    //LOGICA PARA subir data  
  }
  downloadData() {
    //LOGICA PARA bajar data
  }
  synchronizeData() {
    //LOGICA PARA sincronizar data
  }
}
