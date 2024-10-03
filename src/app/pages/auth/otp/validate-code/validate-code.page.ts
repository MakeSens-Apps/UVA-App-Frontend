import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonImg } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-validate-code',
  templateUrl: './validate-code.page.html',
  styleUrls: ['./validate-code.page.scss'],
  standalone: true,
  imports: [IonImg, ExploreContainerComponent]
})
export class ValidateCodePage implements OnInit {

  loader:string = '../../../../../assets/images/loader.gif'
  type
  constructor(private router: Router, private route : ActivatedRoute) { 
    this.type = this.route.snapshot.paramMap.get('type');
  }

  ngOnInit() {
    setTimeout(() => {
      if (this.type == 'login') {
        this.router.navigate(['app/tabs/tab2'])
      } else if (this.type == 'register') {
        console.log("🚀 ~ ValidateCodePage ~ setTimeout ~ type: is Register",)
        
        this.router.navigate(['register/project-vinculation'])
      }
    }, 2*1000);
  }

}
