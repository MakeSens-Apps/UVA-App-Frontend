import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { IonProgressBar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  standalone: true,
  imports:[IonicModule]
})
export class ProgressBarComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
