import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-validate-project',
  templateUrl: './validate-project.page.html',
  styleUrls: ['./validate-project.page.scss'],
  standalone: true,
  imports: [ExploreContainerComponent, IonicModule, RouterLink]
})
export class ValidateProjectPage implements OnInit {
  loader: string = '../../../../../assets/images/loader.gif'
  timer :any;

  constructor(private router : Router) { }

  ngOnInit() {
   this.timer = setTimeout(() => {
        this.router.navigate(['register','project-vinculation-done'])
    }, 2 * 1000);
  }

  cancelTimer() {
    clearTimeout(this.timer)
  }
}
