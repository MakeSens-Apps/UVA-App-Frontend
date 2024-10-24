import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { Animation, AnimationController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash-animation',
  templateUrl: './splash-animation.page.html',
  styleUrls: ['./splash-animation.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
  ],
})
export class SplashAnimationPage implements OnInit {
  private leafIconAnimation: Animation | undefined;
  private poweredByAnimation: Animation | undefined;
  private makeSensLogoAnimation: Animation | undefined;

  constructor(
    private animationCtrl: AnimationController,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.setupAnimations();
  }

  ionViewDidEnter(): void {
    void this.playAnimations();
  }

  setupAnimations(): void {
    const leafIcon = document.querySelector('.leaf-icon');
    const poweredBy = document.querySelector('.powered-by');
    const makeSensLogo = document.querySelector('.make-sens-logo');

    if (leafIcon && poweredBy && makeSensLogo) {
      this.leafIconAnimation = this.animationCtrl
        .create()
        .addElement(leafIcon)
        .duration(1000)
        .iterations(1)
        .fromTo('transform', 'translateY(-100%)', 'translateY(0)')
        .easing('ease-in-out');

      this.poweredByAnimation = this.animationCtrl
        .create()
        .addElement(poweredBy)
        .duration(1000)
        .iterations(1)
        .fromTo('opacity', '0', '1')
        .easing('ease-in')
        .delay(1000);

      this.makeSensLogoAnimation = this.animationCtrl
        .create()
        .addElement(makeSensLogo)
        .duration(1000)
        .iterations(1)
        .fromTo('opacity', '0', '1')
        .easing('ease-in')
        .delay(1000);
    }
  }

  playAnimations(): void {
    try {
      void this.leafIconAnimation?.play();
      void this.poweredByAnimation?.play();
      void this.makeSensLogoAnimation?.play();
      void this.makeSensLogoAnimation?.onFinish(() => {
        setTimeout(() => {
          void this.router.navigate(['/login']);
        }, 1000);
      });
    } catch {
      console.error('Error en la animacion');
    }
  }
}
