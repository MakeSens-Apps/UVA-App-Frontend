import { Component, OnInit } from '@angular/core';
import { IonImg } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project-vinculation-done',
  templateUrl: './project-vinculation-done.page.html',
  styleUrls: ['./project-vinculation-done.page.scss'],
  standalone: true,
  imports: [IonImg, ExploreContainerComponent],
})
export class ProjectVinculationDonePage implements OnInit {
  icon = '../../../../../assets/images/LogoNaturaColombia.svg';
  constructor(private router: Router) {}

  ngOnInit(): void {
    setTimeout(() => {
      void this.router.navigate(['register/register-project-form']);
    }, 3 * 1000);
  }
}
