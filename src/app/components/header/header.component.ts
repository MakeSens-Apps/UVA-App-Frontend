import { Component,  } from '@angular/core';
import { IonChip, IonHeader, IonIcon, IonToolbar ,IonAvatar, IonLabel } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports:[ IonHeader,IonIcon,IonToolbar,IonChip ,IonAvatar,IonLabel]
})
export class HeaderComponent  {

  /**
   *
   * @param router
   */
  constructor(private router: Router) { }


  /**
   *
   */
  goToProfile(): void{
  void this.router.navigate(['/profile']);
  }

}
