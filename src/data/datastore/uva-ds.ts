/**
 * B04 — UvaDSService
 * Ported from: src/app/core/services/storage/datastore/uva-ds.service.ts
 * Classification: Minor adaptation
 * Changes:
 *   - No @Injectable (already had none in original)
 *   - Import paths updated to mobile/ structure
 *   - SessionService → imported from provisional placeholder (B05 will replace)
 *
 * Static methods preserved as-is (portability-matrix §4.1).
 */

import { DataStore } from '@aws-amplify/datastore';
import { UVA } from '@/data/models';
import SessionService from '@/data/session/session';
import type { AppVersionReport } from '@/domain/app-version-report/app-version-report';

interface UVAUpdateDate {
  latitude?: string;
  longitude?: string;
  altitud?: string;
  fields?: string;
}

/**
 * Service for managing UVA data.
 */
export class UvaDSService {
  static session = new SessionService();

  /**
   * Retrieves a UVA by its ID.
   * @returns {Promise<UVA | undefined>} The UVA object.
   */
  static async getUVAByID(): Promise<UVA | undefined> {
    try {
      const uvaID = (await this.session.getInfo()).uvaID ?? '';
      return await DataStore.query(UVA, uvaID);
    } catch (error) {
      console.error('Error fetching UVA', error);
      throw error;
    }
  }

  /**
   * Retrieves a UVA by its own id (F4-05, #60: the registration lock already has the id).
   * @param {string} uvaID - ID of the UVA.
   * @returns {Promise<UVA | undefined>} The UVA, or undefined if it is not on the phone yet.
   */
  static async getUVA(uvaID: string): Promise<UVA | undefined> {
    return DataStore.query(UVA, uvaID);
  }

  /**
   * Retrieves a UVA by its userID.
   * An account can have more than one UVA, and the login and DataStore do not list them in
   * the same order: the preferred one (the session's) wins when it is among them, so the app
   * keeps using the same UVA from one start to the next (F4-06, #61: the reactivation notice
   * is remembered per UVA).
   * @param {string} userID - ID of the User.
   * @param {string} [preferredUvaID] - UVA to keep if it belongs to this user on the phone.
   * @returns {Promise<UVA | undefined>} The UVA object.
   */
  static async getUVAByuserID(
    userID: string,
    preferredUvaID?: string | null,
  ): Promise<UVA | undefined> {
    try {
      const uvas = await DataStore.query(UVA, (c) => c.userID.eq(userID));
      if (uvas && uvas.length > 0) {
        return uvas.find((uva) => uva.id === preferredUvaID) ?? uvas[0];
      }
      return undefined;
    } catch (error) {
      console.error('Error fetching UVA', error);
      throw error;
    }
  }

  /**
   * Writes the app version report on the UVA (#76): both fields together, nothing else.
   * @param {UVA} uva - The UVA as read from DataStore.
   * @param {AppVersionReport} report - Version and UTC ISO 8601 date.
   * @returns {Promise<UVA>} The saved UVA.
   */
  static async saveAppVersionReport(
    uva: UVA,
    report: AppVersionReport,
  ): Promise<UVA> {
    return DataStore.save(
      UVA.copyOf(uva, (updated) => {
        updated.appVersion = report.appVersion;
        updated.appVersionReportedAt = report.appVersionReportedAt;
      }),
    );
  }

  /**
   * Calls the listener with the id of every changed UVA, local or synced (#76).
   * DataStore.clear() at sign-out closes the subscription: subscribe again after the next
   * 'ready'.
   * @param {(uvaId: string) => void} listener - Called on each change.
   * @returns {() => void} The unsubscribe function.
   */
  static observeUVAs(listener: (uvaId: string) => void): () => void {
    const subscription = DataStore.observe(UVA).subscribe({
      next: ({ element }) => listener(element.id),
      error: (error: unknown) => {
        console.error('Error observing the UVA', error);
      },
    });
    return () => subscription.unsubscribe();
  }

  /**
   * Updates a UVA's data.
   * @param {UVAUpdateDate} updates - Partial object with updated fields.
   * @returns {Promise<UVA | undefined>} The updated UVA object.
   */
  static async updateUVA(updates: UVAUpdateDate): Promise<UVA | undefined> {
    try {
      const uvaID = (await this.session.getInfo()).uvaID ?? '';
      const original = await DataStore.query(UVA, uvaID);
      if (original) {
        return await DataStore.save(
          UVA.copyOf(original, (updated) => {
            updated.latitude = updates.latitude;
            updated.longitude = updates.longitude;
            updated.altitude = updates.altitud;
            updated.fields = updates.fields;
          }),
        );
      }
      return undefined;
    } catch (error) {
      console.error('Error updating UVA', error);
      throw error;
    }
  }
}
