import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-validate-project',
  templateUrl: './validate-project.page.html',
  styleUrls: ['./validate-project.page.scss'],
  standalone: true,
  imports: [ExploreContainerComponent, IonicModule, RouterLink],
})
export class ValidateProjectPage implements OnInit {
  loader = '../../../../../assets/images/loader.gif';
  timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.timer = setTimeout(() => {
      void this.router.navigate(['register', 'project-vinculation-done']);
    }, 2 * 1000);
  }

  cancelTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
    }
  }
}
