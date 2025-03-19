import { Injectable } from '@angular/core';

import { Preferences } from '@capacitor/preferences';
import { Session, sessionKeys } from 'src/models/session.model';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  /**
   * Guarda información parcial o completa en Preferences.
   * Recorre las claves del objeto `userInfo` y guarda los valores correspondientes.
   * @param {Session} userInfo - Objeto que contiene la información del usuario a guardar.
   * @returns {Promise<void>} Promesa que se resuelve cuando se completa la operación de guardado.
   */
  async setInfo(userInfo: Session): Promise<void> {
    for (const key of Object.keys(userInfo)) {
      const value = userInfo[key as keyof Session];
      if (value) {
        await Preferences.set({ key, value });
      }
    }
  }

  /**
   * Obtiene información parcial o completa desde Preferences.
   * Recorre las claves del modelo y recupera los valores almacenados.
   * @returns {Promise<Session>} Promesa que se resuelve con el objeto `Session` que contiene la información recuperada.
   */
  async getInfo(): Promise<Session> {
    let session: Session = {};

    // Recorre las claves del modelo y recupera los valores de Preferences
    for (const key of sessionKeys) {
      const { value } = await Preferences.get({ key: key as string });

      // Solo asignamos si obtenemos un valor
      if (value) {
        session[key] = value; // Guardamos el valor en el campo correspondiente de session
      }
    }

    return session;
  }

  /**
   * Guarda o actualiza un campo específico en Preferences.
   * @param {keyof Session} key - La clave del campo que se va a guardar o actualizar.
   * @param {string | undefined} value - El valor que se va a guardar. Si es `undefined`, se eliminará el valor almacenado.
   * @returns {Promise<void>} Promesa que se resuelve cuando se completa la operación de guardado.
   */
  async setInfoField(
    key: keyof Session,
    value: string | undefined,
  ): Promise<void> {
    if (value !== undefined) {
      // Solo actualizamos si el valor no es undefined

      await Preferences.set({
        key: key as string, // Preferences requiere el key como string
        value: value,
      });
    } else {
      // Si se pasa undefined, eliminamos el valor de Preferences
      await Preferences.remove({ key: key as string });
    }
  }

  /**
   * Borra toda la información almacenada en Preferences.
   * Se utiliza, por ejemplo, al cerrar sesión
   * @returns {void} No devuelve nada.
   */
  clearSession(): void {
    void Preferences.clear();
  }
}
