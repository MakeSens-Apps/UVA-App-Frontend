import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SessionService } from '@app/core/services/session/session.service';
import { HeaderComponent } from '@app/components/header/header.component';

import { SetupService } from '@app/core/services/view/setup/setup.service';
import { Session } from 'src/models/session.model';
@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule,HeaderComponent]
})
export class Tab2Page implements OnInit {
  user: Session | null = null;
  /**
   * Creates an instance of Tab2Page.
   * @param {Router} router Redireccion a otras vistas
   * @param {SessionService} session Servicio para manejar datos en cache del usuario
   * @param {SetupService} service  Servicio para manejar las funcionalidades del flujo de setup del usuario
   * @memberof Tab2Page
   */
  constructor(
    private router: Router,
    private session: SessionService,
    private service: SetupService,
  ) {}

  /**
   *
   * @returns {Promise<void>}
   * @memberof Tab2Page
   */
  async ngOnInit(): Promise<void> {
    this.user = await this.session.getInfo();
    console.log('🚀 ~ Tab2Page ~ ngOnInit ~ this.user:', this.user);
  }

  /**
   *
   * @returns {Promise<void>}
   * @memberof Tab2Page
   */
  async close(): Promise<void> {
    const response = await this.service.signOut();
    if (response) {
      this.session.clearSession();
      await this.router.navigate([''], {
        replaceUrl: true,
      });
    }
  }


}
