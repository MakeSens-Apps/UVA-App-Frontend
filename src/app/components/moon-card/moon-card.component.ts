import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-moon-card',
  templateUrl: './moon-card.component.html',
  styleUrls: ['./moon-card.component.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class MoonCardComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
