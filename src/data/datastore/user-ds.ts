/**
 * B04 — UserDSService
 * Ported from: src/app/core/services/storage/datastore/user-ds.service.ts
 * Classification: Minor adaptation
 * Changes:
 *   - No @Injectable (already had none in original)
 *   - Import paths updated to mobile/ structure
 *   - SessionService → imported from provisional placeholder (B05 will replace)
 *
 * Static methods preserved as-is (portability-matrix §4.1).
 */

import { DataStore } from '@aws-amplify/datastore';
import { User } from '@/data/models';
import SessionService from '@/data/session/session';

interface UserUpdateData {
  name?: string;
  lastName?: string;
  email?: string;
}

/**
 * Service for managing User data.
 */
export class UserDSService {
  static session = new SessionService();

  /**
   * Retrieves a User by logged
   * @returns {Promise<User | undefined>}The User object.
   */
  static async getUser(): Promise<User | undefined> {
    try {
      const userID = (await this.session.getInfo()).userID ?? '';
      return await DataStore.query(User, userID);
    } catch (error) {
      console.error('Error fetching User', error);
      throw error;
    }
  }

  /**
   * Rehidrata `session.uvaID` desde el `User` local cuando falta.
   *
   * NO existe en el original: en Ionic toda la sesión vive en un único store
   * (Capacitor Preferences) y `uvaID` no puede desaparecer por separado. En RN la
   * sesión está partida entre expo-secure-store (`userID`, `phone`) y AsyncStorage
   * (`uvaID`, `racimoID`, …) — ver session.ts:27 —, así que se puede quedar
   * autenticado y sin `uvaID`. En ese estado `UvaDSService.getUVAByID()` consulta
   * con id '' (ubicación vacía en el perfil), `MeasurementDSService` crea
   * mediciones con uvaID '' y `updateUser` borraba la relación User→UVA.
   *
   * El `User` local es la fuente de verdad offline de esa relación.
   *
   * @returns {Promise<string | undefined>} uvaID vigente, o undefined si el
   *   usuario todavía no tiene UVA asignada (o DataStore no está disponible).
   */
  static async ensureSessionUvaID(): Promise<string | undefined> {
    try {
      const sessionUvaID = (await this.session.getInfo()).uvaID;
      if (sessionUvaID) return sessionUvaID;

      const user = await this.getUser();
      const localUvaID = user?.uvaID ?? undefined;
      if (localUvaID) {
        await this.session.setInfoField('uvaID', localUvaID);
        return localUvaID;
      }
    } catch (error) {
      // Offline / DataStore sin iniciar: no es fatal, el arranque sigue su curso.
      console.error(
        'ensureSessionUvaID: no se pudo recuperar el User local',
        error,
      );
    }
    return undefined;
  }

  /**
   * Updates a User's data.
   * @param {UserUpdateData} update - Partial object with updated fields.
   * @returns {Promise<User | undefined>}The updated User object.
   */
  static async updateUser(update: UserUpdateData): Promise<User | undefined> {
    try {
      const session = await this.session.getInfo();
      const userID = session.userID ?? '';
      const sessionUvaID = session.uvaID ?? '';
      const user = await DataStore.query(User, userID);
      if (user) {
        return await DataStore.save(
          User.copyOf(user, (updated) => {
            updated.Name = update.name ?? '';
            updated.LastName = update.lastName ?? '';
            updated.Email = update.email;
            // DESVIACIÓN MÍNIMA del original
            // (src/app/core/services/storage/datastore/user-ds.service.ts:37-45):
            // el original hacía `updated.uvaID = uvaID` con `uvaID = session.uvaID ?? ''`,
            // porque en Ionic TODA la sesión vive en un único store (Capacitor
            // Preferences) y `uvaID` siempre está presente tras el setup.
            //
            // En RN la sesión está partida en DOS stores con ciclos de vida
            // independientes (session.ts:27): `userID`/`phone` en expo-secure-store
            // y el resto — incluido `uvaID` — en AsyncStorage. Es posible quedar con
            // `userID` presente (el auth gate pasa) y `uvaID` ausente; con el código
            // original eso escribía uvaID='' y el backend rechazaba la mutación:
            //   "Cannot return null for non-nullable type: 'ID' within parent 'UVA'
            //    (/updateUser/UVA/id)"
            // dejando además al usuario SIN UVA (relación User→UVA borrada).
            //
            // `sessionUvaID || user.uvaID` conserva la relación existente: sólo se
            // reescribe cuando la sesión tiene un valor real (lo que además REPARA
            // un `uvaID` local nulo), y nunca se pisa con ''/undefined.
            updated.uvaID = sessionUvaID || user.uvaID;
          }),
        );
      }
      return undefined;
    } catch (error) {
      console.error('Error updating User', error);
      throw error;
    }
  }
}
