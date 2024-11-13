import { Injectable } from '@angular/core';
import { SessionService } from '../../session/session.service';
import { RacimoAPIService } from '../../api/racimo-api.service';
import { UvaAPIService } from '../../api/uva-api.service';
import {
  UVAsByRacimoIDQueryVariables,
  ModelSortDirection,
  ListRACIMOSQueryVariables,
  GetRACIMOQueryVariables,
} from 'src/API';

@Injectable({
  providedIn: 'root',
})
export class SetupRacimoService {
  /**
   * Constructs an instance of the SetupRacimoService.
   * @param {SessionService} session - Manages session-related data storage.
   * @param {RacimoAPIService} racimoAPI - Provides API calls for RACIMO data retrieval.
   * @param {UvaAPIService} uvaAPI - Provides API calls for UVA data retrieval and creation.
   */
  constructor(
    private session: SessionService,
    private racimoAPI: RacimoAPIService,
    private uvaAPI: UvaAPIService,
  ) {}

  /**
   * Retrieves the last UVA ID associated with a specified RACIMO, sorted in descending order.
   * @param {string} racimoID - The ID of the RACIMO.
   * @returns {Promise<string | undefined>} - Resolves to the last UVA ID if found, otherwise undefined.
   */
  private async getLastUVAId(racimoID: string): Promise<string | undefined> {
    const variables: UVAsByRacimoIDQueryVariables = {
      racimoID: racimoID,
      limit: 1,
      sortDirection: ModelSortDirection.DESC,
    };

    const response = await this.uvaAPI.getUVAByRACIMO(variables);
    if (response.success) {
      const uvaItems = response.data?.UVAsByRacimoID?.items;

      if (uvaItems && uvaItems.length > 0) {
        const { id: uvaId } = uvaItems[0] || {};
        return uvaId;
      }
    }
    return undefined;
  }

  /**
   * Retrieves the linkage code of a specified RACIMO.
   * @param {string} racimoID - The ID of the RACIMO.
   * @returns {Promise<string | undefined>} - Resolves to the RACIMO linkage code if found, otherwise undefined.
   */
  private async getCodeRacimo(racimoID: string): Promise<string | undefined> {
    const variables: GetRACIMOQueryVariables = {
      id: racimoID,
    };

    const response = await this.racimoAPI.getRACIMO(variables);
    if (response.success) {
      const linkageCode = response.data?.getRACIMO?.LinkageCode;
      if (linkageCode) {
        return linkageCode;
      }
    }
    return undefined;
  }

  /**
   * Searches for an active UVA associated with a user and stores its IDs in the session.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<boolean>} - Returns true if an active UVA is found, false otherwise.
   */
  async getUVA(userId: string): Promise<boolean> {
    try {
      const response = await this.uvaAPI.getUVAByUser({
        userID: userId,
      });

      if (response.success) {
        const uvaItems = response.data?.UVAbyUserID?.items;

        if (uvaItems && uvaItems.length > 0) {
          const { racimoID, id: uvaID } = uvaItems[0] || {};

          if (racimoID && uvaID) {
            await this.session.setInfoField('racimoID', racimoID);
            await this.session.setInfoField('uvaID', uvaID);
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
   * Creates a new UVA record with a unique ID based on the last existing UVA ID.
   * @returns {Promise<boolean>} - Returns true if the UVA creation is successful, false otherwise.
   */
  async createNewUVA(): Promise<boolean> {
    const racimoID = (await this.session.getInfo()).racimoID ?? '';
    const userId = (await this.session.getInfo()).userID ?? '';
    const lastUVA = await this.getLastUVAId(racimoID);
    const codeRacimo = await this.getCodeRacimo(racimoID);

    let newIdUVA: string;
    if (lastUVA) {
      const match = lastUVA.match(/(\d{5})$/);
      if (match) {
        const currentNumber = parseInt(match[0], 10);
        const newNumber = currentNumber + 1;
        const newNumberFormatted = newNumber.toString().padStart(5, '0');
        newIdUVA = `UVA_${codeRacimo}_${newNumberFormatted}`;
      } else {
        console.error(
          'No se encontró un número de 5 dígitos al final de la cadena.',
        );
        return false;
      }
    } else {
      newIdUVA = `UVA_${codeRacimo}_00000`;
    }

    const createUVAResponse = await this.uvaAPI.createUVA({
      id: newIdUVA,
      userID: userId,
      racimoID: racimoID,
      enabled: true,
    });
    if (createUVAResponse.success) {
      await this.session.setInfoField('uvaID', newIdUVA);
    }
    return createUVAResponse.success;
  }
  /**
   * Updates the UVA (Unit Value Added) information with specified fields and location data.
   * @async
   * @param {string} [fields] - Optional fields to update in the UVA data.
   * @param {string} [latitude] - Optional latitude coordinate for the UVA location.
   * @param {string} [longitude] - Optional longitude coordinate for the UVA location.
   * @param {string} [altitude] - Optional altitude for the UVA location.
   * @returns {Promise<boolean>} - A promise that resolves to `true` if the update was successful, or `false` if the update failed or the UVA ID was not found.
   */
  async updateUVA(
    fields?: string,
    latitude?: string,
    longitude?: string,
    altitude?: string,
  ): Promise<boolean> {
    const uvaId = (await this.session.getInfo()).uvaID;
    if (uvaId) {
      const updateUVAResponse = await this.uvaAPI.updateUVA({
        id: uvaId,
        fields: fields,
        latitude: latitude,
        longitude: longitude,
        altitude: altitude,
      });
      return updateUVAResponse.success;
    }
    return false;
  }

  /**
   * Searches for a RACIMO using a linkage code and stores its ID in the session.
   * @param {string} linkageCode - The RACIMO linkage code.
   * @returns {Promise<boolean>} - Returns true if a RACIMO is found, false otherwise.
   */
  async getRACIMOByCode(linkageCode: string): Promise<boolean> {
    const variables: ListRACIMOSQueryVariables = {
      filter: {
        LinkageCode: {
          eq: linkageCode,
        },
      },
      limit: 1,
    };
    const responseGetRacimo = await this.racimoAPI.listRACIMOS(variables);
    if (responseGetRacimo.success) {
      const racimoItems = responseGetRacimo.data?.listRACIMOS?.items;

      if (racimoItems && racimoItems.length > 0) {
        const { id: racimoID } = racimoItems[0] || {};

        if (racimoID) {
          await this.session.setInfoField('racimoID', racimoID);
          return await this.getRACIMOByID(racimoID);
        }
      }
    }
    return false;
  }

  /**
   * Searches for a RACIMO using its ID and stores relevant data in the session.
   * @param {string} id - The ID of the RACIMO.
   * @returns {Promise<boolean>} - Returns true if a RACIMO is found, false otherwise.
   */
  async getRACIMOByID(id: string): Promise<boolean> {
    const variables: GetRACIMOQueryVariables = {
      id,
    };
    const responseGetRacimo = await this.racimoAPI.getRACIMO(variables);
    if (responseGetRacimo.success) {
      const racimo = responseGetRacimo.data?.getRACIMO;
      if (racimo) {
        await this.session.setInfoField('racimoName', racimo.Name);
        await this.session.setInfoField('racimoLinkCode', racimo.LinkageCode);
        await this.session.setInfoField(
          'racimoConfiguration',
          racimo.Configuration ?? '',
        );
        return true;
      }
    }
    return false;
  }
}
