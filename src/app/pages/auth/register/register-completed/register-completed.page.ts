import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { IonImg } from '@ionic/angular/standalone';

@Component({
  selector: 'app-register-completed',
  templateUrl: './register-completed.page.html',
  styleUrls: ['./register-completed.page.scss'],
  standalone: true,
  imports: [IonImg, ExploreContainerComponent],
})
export class RegisterCompletedPage implements OnInit {
  icon = '../../../../../assets/images/LogoNaturaColombia.svg';
  constructor(private router: Router) {}

  ngOnInit(): void {
    setTimeout(() => {
      void this.router.navigate(['app/tabs/tab2']);
    }, 3 * 1000);
  }
}
