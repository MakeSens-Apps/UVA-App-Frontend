import { Injectable } from '@angular/core';
import { UserProgressDSService } from '../../storage/datastore/user-progress-ds.service';
import { SessionService } from '../../session/session.service';

export interface LASTUSERPROGRESS {
  seed: number;
  streak: number;
  completedTask: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  /**
   * Crea una instancia de `ProfileService`.
   * @param {SessionService }session - Servicio de sesión para obtener información del usuario actual.
   */
  constructor(private session: SessionService) {}

  /**
   * Obtiene el progreso más reciente del usuario actual.
   * @returns {Promise<LASTUSERPROGRESS>} Una promesa que resuelve con el progreso del usuario.
   * @throws Puede lanzar un error si ocurre algún problema al obtener la información de sesión o el progreso.
   */
  async lastUserProgress(): Promise<LASTUSERPROGRESS> {
    const userID = (await this.session.getInfo()).userID ?? '';

    const progressUser =
      await UserProgressDSService.getLastUserProgress(userID);

    return {
      seed: progressUser?.Seed ?? 0,
      streak: progressUser?.Streak ?? 0,
      completedTask: progressUser?.completedTasks ?? 0,
    };
  }
}
