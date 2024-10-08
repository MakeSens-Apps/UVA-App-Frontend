import { Component, OnInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../../explore-container/explore-container.component';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { USER_KEY } from '../auth/register/register.page';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, ExploreContainerComponent,CommonModule, IonicModule]
})
export class Tab2Page implements OnInit {
user:any
  constructor(private router : Router) {}
  

  async ngOnInit() {
    const ret = await Preferences.get({ key: USER_KEY });
    this.user = JSON.parse(ret.value ? ret.value : '');
    console.log("🚀 ~ Tab2Page ~ ngOnInit ~ this.user:", this.user)
  }

  close() {
    this.router.navigate([''],{
      replaceUrl: true
    })
  }
}
