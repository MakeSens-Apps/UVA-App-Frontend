import { HeaderComponent } from './../../components/header/header.component';
import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../../explore-container/explore-container.component';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { CalendarComponent } from '@app/components/calendar/calendar.component';
import { ProgressBarComponent } from "../../components/progress-bar/progress-bar.component";
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es'
import { MoonCardComponent } from "../../components/moon-card/moon-card.component";

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, ExploreContainerComponent, CommonModule, IonicModule, CalendarComponent, HeaderComponent, ProgressBarComponent, MoonCardComponent]

})
export class Tab1Page {
  today:string;
  modals = {
    modal_Days: false,
    modal_Days_question: false,
    modal_token : false,
    modal_token_2: false
  } 
    constructor(private router : Router) {
      this.today = format(new Date(), " EEEE dd 'de' MMMM",{locale:es})
    }
  
    close() {
      this.router.navigate([''],{
        replaceUrl: true
      })
    }
  
  }
  