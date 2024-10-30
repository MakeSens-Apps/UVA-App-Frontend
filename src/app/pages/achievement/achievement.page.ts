import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-achievement',
  templateUrl: './achievement.page.html',
  styleUrls: ['./achievement.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule, 
    FormsModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AchievementPage implements OnInit {
  constructor(private router: Router) { }
  achievements = [
    { icon: '../../../assets/images/icons/brote1.png' },
    { icon: '../../../assets/images/icons/platula.svg' },
    { icon: '../../../assets/images/icons/flor.svg' },
    { icon: '../../../assets/images/icons/platula.svg' },
  
   
  ];

  modals = {
    modal_show: false,
    modal_show_2: false,
  }
  ngOnInit() { console.log("ini")}

  goBack(url:string) {
    this.router.navigate([url]);   
  }

}

