/**
 * B07 — SetupRacimoService (domain/setup)
 * Ported from: src/app/core/services/view/setup/setup-racimo.service.ts
 * Classification: Minor adaptation
 *
 * Changes from original (portability-matrix §4.1):
 *   - Removed @Injectable({ providedIn: 'root' }) → static methods on class
 *   - DI constructor → direct singleton imports
 *   - SessionService, RacimoAPIService, UvaAPIService → imported singletons
 *   - All method signatures preserved exactly
 *   - UVA ID generation preserved: UVA_<code>_<NNNNN> where NNNNN is zero-padded 5-digit
 *   - No Angular / React / UI imports
 *
 * Plan B07: "setup-racimo.service como módulo, Jest del id secuencial UVA_<code>_<00000+1>"
 *
 * UVA ID format: UVA_<racimoLinkCode>_<zero-padded 5-digit sequence>
 * - First UVA: UVA_<code>_00000
 * - Subsequent: extracts last 5 digits from lastUVA id, increments by 1
 */

import SessionService from '@/data/session/session';
import { racimoAPIService } from '@/data/api/racimo-api';
import { uvaAPIService } from '@/data/api/uva-api';
import type {
  UVAsByRacimoIDQueryVariables,
  ListRACIMOSQueryVariables,
  GetRACIMOQueryVariables,
} from '@/data/graphql/API';

// ModelSortDirection enum from original — preserved exactly
export enum ModelSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

// ─── Singleton session ────────────────────────────────────────────────────────
const sessionService = new SessionService();

// ─── Pure UVA ID generation (testable) ───────────────────────────────────────

/**
 * Generates the next sequential UVA ID.
 * Pattern: UVA_<code>_<NNNNN> where NNNNN is zero-padded to 5 digits.
 *
 * Rules:
 *   - If lastUVAId is provided and ends with 5 digits, increment that number
 *   - If lastUVAId is null/undefined, the first ID is UVA_<code>_00000
 *   - If lastUVAId does not end with 5 digits, returns null (error case)
 *
 * @param {string | null | undefined} lastUVAId - The ID of the most recent UVA
 * @param {string} racimoCode - The RACIMO linkage code
 * @returns {string | null} The next UVA ID, or null on format error
 */
export function generateNextUVAId(
  lastUVAId: string | null | undefined,
  racimoCode: string,
): string | null {
  if (!lastUVAId) {
    return `UVA_${racimoCode}_00000`;
  }

  const match = lastUVAId.match(/(\d{5})$/);
  if (!match) {
    return null; // Format error — caller should handle
  }

  const currentNumber = parseInt(match[0], 10);
  const newNumber = currentNumber + 1;
  const newNumberFormatted = newNumber.toString().padStart(5, '0');
  return `UVA_${racimoCode}_${newNumberFormatted}`;
}

// ─── SetupRacimoService ───────────────────────────────────────────────────────

export class SetupRacimoService {
  /**
   * Retrieves the last UVA ID associated with a specified RACIMO, sorted in descending order.
   * @private
   * @param {string} racimoID
   * @returns {Promise<string | undefined>}
   */
  private static async getLastUVAId(
    racimoID: string,
  ): Promise<string | undefined> {
    const variables: UVAsByRacimoIDQueryVariables = {
      racimoID,
      limit: 1,
      sortDirection: ModelSortDirection.DESC,
    };

    const response = await uvaAPIService.getUVAByRACIMO(variables);
    if (response.success) {
      const uvaItems = response.data?.UVAsByRacimoID?.items;
      if (uvaItems && uvaItems.length > 0) {
        const { id: uvaId } = uvaItems[0] || {};
        return uvaId ?? undefined;
      }
    }
    return undefined;
  }

  /**
   * Retrieves the linkage code of a specified RACIMO.
   * @private
   * @param {string} racimoID
   * @returns {Promise<string | undefined>}
   */
  private static async getCodeRacimo(
    racimoID: string,
  ): Promise<string | undefined> {
    const variables: GetRACIMOQueryVariables = { id: racimoID };
    const response = await racimoAPIService.getRACIMO(variables);
    if (response.success) {
      const linkageCode = response.data?.getRACIMO?.LinkageCode;
      if (linkageCode) {
        return linkageCode;
      }
    }
    return undefined;
  }

  /**
   * Searches for an active UVA associated with a user and stores its IDs in session.
   * @param {string} userId
   * @returns {Promise<boolean>} True if an active UVA was found.
   */
  static async getUVA(userId: string): Promise<boolean> {
    try {
      const response = await uvaAPIService.getUVAByUser({ userID: userId });

      if (response.success) {
        const uvaItems = response.data?.UVAbyUserID?.items;

        if (uvaItems && uvaItems.length > 0) {
          const { racimoID, id: uvaID } = uvaItems[0] || {};

          if (racimoID && uvaID) {
            await sessionService.setInfoField('racimoID', racimoID);
            await sessionService.setInfoField('uvaID', uvaID);
            await sessionService.setInfoField(
              'racimoLinkCode',
              await this.getCodeRacimo(racimoID),
            );
            return true;
          }
        }

        console.error('No active UVA found for the user.');
        return false;
      } else {
        console.error('Error in API response.');
        return false;
      }
    } catch (error) {
      console.error('Error fetching UVA by user:', error);
      return false;
    }
  }

  /**
   * Creates a new UVA record with a sequentially generated ID.
   * The ID follows the pattern: UVA_<racimoCode>_<NNNNN>
   * @returns {Promise<boolean>} True if UVA creation succeeded.
   */
  static async createNewUVA(): Promise<boolean> {
    const racimoID = (await sessionService.getInfo()).racimoID ?? '';
    const userId = (await sessionService.getInfo()).userID ?? '';
    const lastUVA = await this.getLastUVAId(racimoID);
    const codeRacimo = await this.getCodeRacimo(racimoID);

    const newIdUVA = generateNextUVAId(lastUVA ?? null, codeRacimo ?? '');

    if (!newIdUVA) {
      console.error(
        'No se encontró un número de 5 dígitos al final de la cadena.',
      );
      return false;
    }

    const createUVAResponse = await uvaAPIService.createUVA({
      id: newIdUVA,
      userID: userId,
      racimoID,
      enabled: true,
    });

    if (createUVAResponse.success) {
      await sessionService.setInfoField('uvaID', newIdUVA);
    }
    return createUVAResponse.success;
  }

  /**
   * Updates the UVA information with specified fields and location data.
   * @param {string} [fields]
   * @param {string} [latitude]
   * @param {string} [longitude]
   * @param {string} [altitude]
   * @returns {Promise<boolean>}
   */
  static async updateUVA(
    fields?: string,
    latitude?: string,
    longitude?: string,
    altitude?: string,
  ): Promise<boolean> {
    const uvaId = (await sessionService.getInfo()).uvaID;
    if (uvaId) {
      const updateUVAResponse = await uvaAPIService.updateUVA({
        id: uvaId,
        fields,
        latitude,
        longitude,
        altitude,
      });
      return updateUVAResponse.success;
    }
    return false;
  }

  /**
   * Searches for a RACIMO by its linkage code and stores its ID in session.
   * @param {string} linkageCode
   * @returns {Promise<boolean>}
   */
  static async getRACIMOByCode(linkageCode: string): Promise<boolean> {
    const variables: ListRACIMOSQueryVariables = {
      filter: {
        LinkageCode: { eq: linkageCode },
      },
    };

    const responseGetRacimo = await racimoAPIService.listRACIMOS(variables);
    if (responseGetRacimo.success) {
      const racimoItems = responseGetRacimo.data?.listRACIMOS?.items;

      if (racimoItems && racimoItems.length > 0) {
        const { id: racimoID } = racimoItems[0] || {};
        if (racimoID) {
          await sessionService.setInfoField('racimoID', racimoID);
          return await this.getRACIMOByID(racimoID);
        }
      }
    }
    return false;
  }

  /**
   * Searches for a RACIMO by ID and stores relevant data in session.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  static async getRACIMOByID(id: string): Promise<boolean> {
    const variables: GetRACIMOQueryVariables = { id };
    const responseGetRacimo = await racimoAPIService.getRACIMO(variables);
    if (responseGetRacimo.success) {
      const racimo = responseGetRacimo.data?.getRACIMO;
      if (racimo) {
        await sessionService.setInfoField('racimoName', racimo.Name);
        await sessionService.setInfoField(
          'racimoLinkCode',
          racimo.LinkageCode,
        );
        await sessionService.setInfoField(
          'racimoConfiguration',
          racimo.Configuration ?? '',
        );
        return true;
      }
    }
    return false;
  }
}
