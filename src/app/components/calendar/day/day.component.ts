import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-day',
  templateUrl: './day.component.html',
  styleUrls: ['./day.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class DayComponent  implements OnInit {

  @Input() day: number = 0;
  @Input() isToday: boolean = false;
  @Input() state: 'complete'|'incomplete'|'future'|'normal'| undefined = 'normal';

  constructor() { }

  ngOnInit() {}

}
