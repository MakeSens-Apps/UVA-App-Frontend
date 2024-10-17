import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { addDays, eachDayOfInterval, endOfWeek, getDay, getDaysInMonth, startOfMonth, startOfWeek } from 'date-fns';
import { DayComponent } from "./day/day.component";
interface calendar {
  date: Date | null;
  dayOfMonth: number | null;
  dayOfWeek: number| null;
  state?:'complete'|'incomplete'|'future'|'normal';
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  imports: [CommonModule, IonicModule, DayComponent],
  standalone: true,
})


export class CalendarComponent  implements OnInit {

    title = 'calendar';
    calendar:calendar[] = [];
    @Input() calendarView = 'month';
    @Input() hasHeader = false;
    viewDate = new Date();
    today = new Date().getDate();

    daysComplete = [15,14,11]
    daysIncomplete = [13,12]

  constructor() { }

  ngOnInit() {
    if(this.calendarView === 'month'){
      this.generateCalendarMonth();
    }
    else if(this.calendarView === 'week'){
      this.generateCalendarWeek();
    }
// Generate the calendar for the current month
  }

  generateCalendarMonth() {
    const daysInMonth = getDaysInMonth(this.viewDate);  // Días en el mes actual
    const firstDayOfMonth = getDay(startOfMonth(this.viewDate));  // Primer día del mes (0 = Domingo, 1 = Lunes, etc.)

    this.calendar = [];

    // Añadir celdas vacías para los días antes del primer día del mes
    for (let i = 0; i < firstDayOfMonth; i++) {
      this.calendar.push({
        date: null,
        dayOfMonth: null,
        dayOfWeek: null,
      });
    }

    // Añadir celdas para cada día del mes
    const startDate = startOfMonth(this.viewDate);
    const endDate = addDays(startDate, daysInMonth - 1);

    const daysArray = eachDayOfInterval({
      start: startDate,
      end: endDate
    });

    daysArray.forEach((day:any,i:number) => {
      this.calendar.push({
        date: day,
        dayOfMonth: day.getDate(),
        dayOfWeek: day.getDay() ,
        //FIXME: hacer mergue de status
     //   state: i > this.today ? 'future' : 'normal',
        state: day.getDate() > this.today ? 'future' : this.getStatus(day.getDate()),

       // incomplete: i == 11
      });
    });

    console.log("🚀 ~ CalendarComponent ~ generateCalendar ~ this.calendar :", this.calendar);
  }

  getStatus(day:number){
    if(this.daysComplete.includes(day)){
      return 'complete'
    }
    if(this.daysIncomplete.includes(day)){
      return 'incomplete'
    }
    return 'normal'
  }

  generateCalendarWeek(){
    const startDate = startOfWeek(this.viewDate);
    const endDate = endOfWeek(this.viewDate);

    const daysArray = eachDayOfInterval({
      start: startDate,
      end: endDate
    });

    this.calendar = daysArray.map((day:any) => {
      return {
        date: day,
        dayOfMonth: day.getDate(),
        dayOfWeek: day.getDay() ,
        state:  day.getDate() > this.today ? 'future' : this.getStatus(day.getDate()),

      };
    });
    console.log("🚀 ~ CalendarComponent ~ generateCalendarWeek ~ this.calendar:", this.calendar)
    
  }

}
