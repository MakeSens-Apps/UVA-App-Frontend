import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SessionService } from '@app/core/services/session/session.service';
import { HeaderComponent } from '@app/components/header/header.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule,HeaderComponent]
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
