import { Component, OnInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../../explore-container/explore-container.component';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SessionService } from '@app/core/services/session/session.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, ExploreContainerComponent,CommonModule, IonicModule]
})
export class Tab2Page implements OnInit {
user:any
  constructor(private router : Router, private session: SessionService) {}
  

  async ngOnInit() {
    this.user = this.session.getInfo();
    console.log("🚀 ~ Tab2Page ~ ngOnInit ~ this.user:", this.user)
  }

  close() {
    this.router.navigate([''],{
      replaceUrl: true
    })
  }
}
