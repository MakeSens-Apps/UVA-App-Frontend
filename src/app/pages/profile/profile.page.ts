import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonChip, IonIcon, IonAvatar, IonButtons, IonButton, IonCard, IonList, IonItem, IonModal, IonGrid, IonRow, IonCol } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonCol, IonRow, IonGrid, IonModal, IonItem, IonList, IonCard, IonButton, IonButtons, IonAvatar, IonIcon, IonChip, IonLabel, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class ProfilePage implements OnInit {
  shareOptions = [
    { label: 'WhatsApp', icon: '../../../assets/images/icons/whatapp.svg', action: () => this.shareOnWhatsApp() },
    { label: 'Notion', icon: '../../../assets/images/icons/notion.svg', action: () => this.goUrlShare('https://notion.so') },
    { label: 'Facebook', icon: '../../../assets/images/icons/face.svg', action: () => this.goUrlShare('https://facebook.com') },
    { label: 'Copiar enlace', icon: '../../../assets/images/icons/content_copy.svg', action: () => this.copyLink() },
    { label: 'Más', icon: '../../../assets/images/icons/more_horiz.svg', color: 'black', action: () => this.shareApp() }
  ];
  modals = {
    modal_show: false,
  }
  appLink = 'https://play.google.com/store/apps/details?id=com.makesens.uva&hl=es_CO';

  constructor(private router: Router) { }

  ngOnInit() { console.log("ini")}

  // Método para compartir en WhatsApp
  shareOnWhatsApp() {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent('Hola, conoce la aplicación Uva-App para registrar tus datos del clima! ' + this.appLink)}`;
    window.open(whatsappUrl, '_blank');
  }

  // Método para copiar el enlace al portapapeles
  async copyLink() {
    await Clipboard.write({
      string: this.appLink
    });
    alert('Enlace copiado al portapapeles');
  }

  async shareApp() {
    await Share.share({
      title: 'Conoce la aplicación Uva-App',
      text: 'Hola, conoce la aplicación Uva-App para registrar tus datos del clima!',
      url: this.appLink,
      dialogTitle: 'Compartir Uva-App'
    });
  }

  goBack(url: string) {
    if (url == '/login') {
      // Lógica de deslogueo
    }
    this.router.navigate([url]);
  }

  goUrlShare(url: string) {
    window.open(url, '_blank');
  }

  goUrl() {
    const url = 'https://www.example.com'; // Reemplaza con la URL que deseas abrir
    window.open(url, '_blank'); // '_blank' abre en una nueva pestaña; usa '_self' para la misma pestaña
  }
}
