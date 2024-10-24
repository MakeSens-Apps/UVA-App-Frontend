import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonLabel,
  IonInput,
  IonCheckbox,
} from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pre-register',
  templateUrl: './pre-register.page.html',
  styleUrls: ['./pre-register.page.scss'],
  standalone: true,
  imports: [
    IonInput,
    CommonModule,
    ExploreContainerComponent,
    IonLabel,
    IonButton,
    IonCheckbox,
  ],
})
export class PreRegisterPage {
  enabledButton = false;
  constructor(
    private router: Router,
    private ref: ChangeDetectorRef,
  ) {}

  checkTerm($event: Event): void {
    this.enabledButton = ($event.target as HTMLInputElement).checked;
    this.ref.detectChanges();
  }

  goToRegister(): void {
    void this.router.navigate(['register']);
  }
}
