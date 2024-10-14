import { Injectable } from '@angular/core';

import { Preferences } from '@capacitor/preferences';
import { SequenceError } from 'rxjs';
import { Session, sessionKeys } from 'src/models/session.model';

@Injectable({
  providedIn: 'root',
})
export class SessionService {

  private keys = {
    userID: 'userID',
    name: 'name',
    lastName: 'lastName',
    phone: 'phone',
    racimoID: 'racimoID',
    uvaID: 'uvaID',
    linkCode: 'linkCode'
  };

  // Guardar información parcial o completa en Preferences
  async setInfo(userInfo: Session) {
    // Recorre las claves del objeto `userInfo` y guarda los valores en Preferences
    for (const key of Object.keys(userInfo)) {
      const value = userInfo[key as keyof Session];
      if (value) {
        await Preferences.set({ key, value });
      }
    }
  }

  // Obtener información parcial o completa
  async getInfo(): Promise<Session> {
    let session: Session = {};

    // Recorre las claves del modelo y recupera los valores de Preferences
    for (const key of sessionKeys) {
      const { value } = await Preferences.get({ key: key as string });
  
      // Solo asignamos si obtenemos un valor
      if (value) {
        session[key] = value;  // Guardamos el valor en el campo correspondiente de session
      }
    }
  
    return session;
  }

  // Guardar o actualizar un campo específico en Preferences
  async setInfoField(key: keyof Session, value: string | undefined) {

  if (value !== undefined) {
    // Solo actualizamos si el valor no es undefined

    await Preferences.set({
      key: key as string,  // Preferences requiere el key como string
      value: value
    });
  } else {
    // Si se pasa undefined, eliminamos el valor de Preferences
    await Preferences.remove({ key: key as string });
  }

  }

  // Borrar toda la información almacenada (por ejemplo, al cerrar sesión)
  async clearSession() {
    await Preferences.clear();
  }
}