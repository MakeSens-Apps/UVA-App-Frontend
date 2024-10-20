import { Component, OnInit } from '@angular/core';
import { IonChip, IonHeader, IonIcon, IonToolbar ,IonAvatar, IonLabel } from '@ionic/angular/standalone';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports:[ IonHeader,IonIcon,IonToolbar,IonChip ,IonAvatar,IonLabel]
})
export class HeaderComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
