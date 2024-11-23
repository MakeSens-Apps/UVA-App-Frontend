import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonLabel,
  IonChip,
  IonIcon,
  IonAvatar,
  IonButtons,
  IonButton,
  IonCard,
  IonList,
  IonItem,
  IonModal,
  IonGrid,
  IonRow,
  IonCol,
  IonItemDivider,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { SetupService } from '@app/core/services/view/setup/setup.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ChangeDetectorRef } from '@angular/core';
import { DataStore } from '@aws-amplify/datastore';

/* eslint-disable @typescript-eslint/type-annotation-spacing */
interface ShareOption {
  label: string;
  icon: string;
  action: () => void | Promise<void>; // Cambia `void` si las funciones devuelven algo específico
  color?: string; // Propiedad opcional
}
/* eslint-enable @typescript-eslint/type-annotation-spacing */

/**
 * @class ProfilePage
 * @description A component that displays user profile information and provides sharing functionality for the Uva-App.
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonItemDivider,
    IonCol,
    IonRow,
    IonGrid,
    IonModal,
    IonItem,
    IonList,
    IonCard,
    IonButton,
    IonButtons,
    IonAvatar,
    IonIcon,
    IonChip,
    IonLabel,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
  ],
})
export class ProfilePage implements OnInit {
  name: string | undefined;
  isRanking = false;
  isSeed = false;
  seed = 0;
  seedIcon = '';
  shareOptions: ShareOption[] = [
    {
      label: 'WhatsApp',
      icon: '../../../assets/images/icons/whatapp.svg',
      action: () => this.shareOnWhatsApp(),
    },
    {
      label: 'Notion',
      icon: '../../../assets/images/icons/notion.svg',
      action: () => this.goUrlShare('https://notion.so'),
    },
    {
      label: 'Facebook',
      icon: '../../../assets/images/icons/face.svg',
      action: () => this.goUrlShare('https://facebook.com'),
    },
    {
      label: 'Copiar enlace',
      icon: '../../../assets/images/icons/content_copy.svg',
      action: () => this.copyLink(),
    },
    {
      label: 'Más',
      icon: '../../../assets/images/icons/more_horiz.svg',
      color: 'black',
      action: () => this.shareApp(),
    },
  ];
  modals: Record<string, boolean> = {
    modal_show_comparte: false,
  };
  appLink =
    'https://play.google.com/store/apps/details?id=com.makesens.uva&hl=es_CO';

  /**
   * @param {Router} router - Angular Router instance used for navigation.
   * @param {SessionService} session -Manage Sesionids .
   * @param {SetupService} service -Manage Sesion setup/login/logout .
   * @param {ConfigurationAppService} configuration -Get configuration app .
   * @param {ChangeDetectorRef} cdr Angular detecte change in app.
   */
  constructor(
    private router: Router,
    private session: SessionService,
    private service: SetupService,
    private configuration: ConfigurationAppService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Start of page variables
   */
  async ngOnInit(): Promise<void> {
    const dataUser = await this.session.getInfo();
    this.name = dataUser.name;
    this.isRanking = true;
    this.isSeed = true;
    this.seed = 3;
    this.seedIcon = '../../../assets/images/icons/semilla.svg';
  }

  // Método para compartir en WhatsApp
  /**
   * Shares a predefined message with a link to the app via WhatsApp.
   * @returns {void}
   */
  shareOnWhatsApp(): void {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent('Hola, conoce la aplicación Uva-App para registrar tus datos del clima! ' + this.appLink)}`;
    window.open(whatsappUrl, '_blank');
  }

  /**
   * Copies the app link to the clipboard.
   * @returns {Promise<void>}
   */
  async copyLink(): Promise<void> {
    await Clipboard.write({
      string: this.appLink,
    });
    alert('Enlace copiado al portapapeles');
  }

  /**
   * Shares the app using the Capacitor Share API.
   * @returns {Promise<void>}
   */
  async shareApp(): Promise<void> {
    await Share.share({
      title: 'Conoce la aplicación Uva-App',
      text: 'Hola, conoce la aplicación Uva-App para registrar tus datos del clima!',
      url: this.appLink,
      dialogTitle: 'Compartir Uva-App',
    });
  }

  /**
   * Navigates back to the specified URL, with additional logic for logging out if the URL is '/login'.
   * @param {string} url - The URL to navigate back to.
   * @returns {Promise<void>}
   */
  async goBack(url: string): Promise<void> {
    if (url == '/login') {
      const response = await this.service.signOut();
      if (response) {
        this.session.clearSession();
        await DataStore.clear();
        await this.router.navigate([''], {
          replaceUrl: true,
        });
      }
    }
    void this.router.navigate([url]);
  }

  /**
   * Opens a specified URL in a new tab.
   * @param {string} url - The URL to open.
   * @returns {void}
   */
  goUrlShare(url: string): void {
    window.open(url, '_blank');
  }

  /**
   * Opens a predefined URL in a new tab.
   * @returns {void}
   */
  goUrl(): void {
    const url = 'https://www.example.com'; // Reemplaza con la URL que deseas abrir
    window.open(url, '_blank'); // '_blank' abre en una nueva pestaña; usa '_self' para la misma pestaña
  }
  /**
   * Opens modal.
   * @returns {void}
   */
  openModal(): void {
    this.modals['modal_show_comparte'] = true;
    this.cdr.detectChanges();
  }

  /**
   * Close modal.
   * @param {string} modalKey ModalDismis
   * @returns {void}
   */
  onModalDismiss(modalKey: string): void {
    this.modals[modalKey] = false;
    this.cdr.detectChanges();
  }
}
