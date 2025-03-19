import { Injectable } from '@angular/core';
import { S3Service } from './s3/s3.service';
import { FileSystemService } from './file-system/file-system.service';
import { Directory } from '@capacitor/filesystem';
import { ConfigModel } from 'src/models/configuration/config.model';
import { ColorsModel } from 'src/models/configuration/colors.model';
import { MeasurementModel } from 'src/models/configuration/measurements.model';
import { Capacitor } from '@capacitor/core';
import { SessionService } from '../session/session.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigurationAppService {
  private basePath = 'public/racimos';
  private pathRacimo = '';
  configApp: ConfigModel | null = null;
  configMeasurement: MeasurementModel | null = null;
  configColors: ColorsModel | null = null;

  /**
   * Service constructor.
   * @param {S3Service} s3 - Service for S3 storage interaction.
   * @param {FileSystemService} fileSystem - Service for file system management.
   * @param {SessionService} session - Service for session management.
   */
  constructor(
    private s3: S3Service,
    private fileSystem: FileSystemService,
    private session: SessionService,
  ) {}

  /**
   * Downloads configuration data associated with a cluster code.
   * @returns {Promise<boolean>} - Returns `true` if all files were successfully downloaded, `false` if any failed.
   */
  async downLoadData(): Promise<boolean> {
    if (!(await this.getPathRacimo())) {
      return false;
    }
    const listFiles = await this.s3.listFiles(this.pathRacimo);
    if (listFiles.success) {
      for (const item of listFiles.data) {
        const file = await this.s3.getFile(item.path);

        if (file.success) {
          let content = '';
          let isBase64 = false;
          switch (file.data.type) {
            case 'TXT':
            case 'JSON':
              isBase64 = false;
              if (typeof file.data.content === 'object') {
                content = JSON.stringify(file.data.content); // Convierte el objeto a cadena JSON
              } else {
                content = file.data.content; // Si ya es una cadena, lo dejamos tal cual
              }
              await this.fileSystem.writeFile(
                item.path,
                content,
                Directory.Data,
                isBase64,
              );
              break;
            case 'BLOB': {
              isBase64 = true;
              const arrayBuffer = await file.data.content.arrayBuffer();
              content = btoa(
                String.fromCharCode(...new Uint8Array(arrayBuffer)),
              );
              await this.fileSystem.writeFile(
                item.path,
                content,
                Directory.Data,
                isBase64,
              );
              break;
            }
            default:
              break;
          }
        } else {
          console.error(`${item.path} Not found`);
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * Checks if the configuration file exists.
   * @returns {Promise<boolean>} - Returns `true` if the configuration file exists, `false` otherwise.
   */
  async configExists(): Promise<boolean> {
    if (!(await this.getPathRacimo())) {
      return false;
    }
    const path = `${this.pathRacimo}/config.json`;
    const response = await this.fileSystem.readFile(path, Directory.Data);
    return response.success;
  }

  /**
   * Retrieves the application configuration.
   * @returns {Promise<ConfigModel | null>} - Application configuration or `null` if not found.
   */
  async getConfigurationApp(): Promise<ConfigModel | null> {
    if (this.configApp === null) {
      const path = `${this.pathRacimo}/config.json`;
      const response = await this.fileSystem.readFile(path, Directory.Data);
      if (response.success) {
        try {
          this.configApp = JSON.parse(
            response.data.data.toString(),
          ) as ConfigModel;
        } catch (err) {}
      } else {
        this.configApp = null;
      }
    }
    return this.configApp;
  }

  /**
   * Retrieves the measurement configuration.
   * @returns {Promise<MeasurementModel | null>} - Measurement configuration or `null` if not found.
   */
  async getConfigurationMeasurement(): Promise<MeasurementModel | null> {
    if (!(await this.getPathRacimo())) {
      return null;
    }
    if (this.configMeasurement === null) {
      const path = `${this.pathRacimo}/measurementRegistration/measurementsRegistration.json`;
      const response = await this.fileSystem.readFile(path, Directory.Data);
      if (response.success) {
        this.configMeasurement = JSON.parse(
          response.data.data.toString(),
        ) as MeasurementModel;
      } else {
        this.configMeasurement = null;
      }
    }
    return this.configMeasurement;
  }

  /**
   * Retrieves the branding color configuration.
   * @returns {Promise<ColorsModel | null>} - Branding color configuration or `null` if not found.
   */
  async getConfigurationColors(): Promise<ColorsModel | null> {
    if (!(await this.getPathRacimo())) {
      return null;
    }
    if (this.configColors === null) {
      const path = `${this.pathRacimo}/branding/colors.json`;
      const response = await this.fileSystem.readFile(path, Directory.Data);
      if (response.success) {
        this.configColors = JSON.parse(
          response.data.data.toString(),
        ) as ColorsModel;
      } else {
        this.configColors = null;
      }
    }
    return this.configColors;
  }

  /**
   * Loads the branding configuration and applies the respective colors.
   * @returns {Promise<void>}
   */
  async loadBranding(): Promise<void> {
    const colors = await this.getConfigurationColors();
    if (colors !== null) {
      this.applyColors(colors);
    } else {
      console.error('No BrandingColors');
    }
  }

  /**
   * Loads an image file based on the specified platform and returns its URI or Blob URL.
   * @param {string} pathFile - The path of the image file.
   * @returns {Promise<string | null>} - Image URI or Blob URL, or `null` if not found.
   */
  async loadImage(pathFile: string): Promise<string | null> {
    const path = `${this.pathRacimo}/${pathFile}`;
    const platform = Capacitor.getPlatform();

    switch (platform) {
      case 'android':
      case 'ios':
        return await this.loadUriFromFilesystem(path);
      case 'web':
        return await this.loadBlobFromFilesystem(path);
      default:
        console.error('Plataforma no soportada:', platform);
        return null;
    }
  }
  /**
   * Counter task function in one day
   * @param {MeasurementModel} model MeasurementModel
   * @returns {number} Count task
   */
  countTasks(model: MeasurementModel): number {
    return Object.keys(model.tasks).length;
  }

  /**
   * Loads an image file as a URI on Android and iOS platforms.
   * @private
   * @param {string} fileName - The file name to load.
   * @returns {Promise<string | null>} - File URI or `null` if there was an error.
   */ private async loadUriFromFilesystem(
    fileName: string,
  ): Promise<string | null> {
    const fileUri = await this.fileSystem.getFileUri(fileName, Directory.Data);
    if (fileUri.success) {
      return Capacitor.convertFileSrc(fileUri.data.uri);
    }
    console.error('Error obteniendo la URI de la imagen:', fileName);
    return null;
  }

  /**
   * Loads an image file as a Blob on Web platforms.
   * @private
   * @param {string} fileName - The file name to load.
   * @returns {Promise<string | null>} - Blob URL or `null` if there was an error.
   */
  private async loadBlobFromFilesystem(
    fileName: string,
  ): Promise<string | null> {
    const fileData = await this.fileSystem.readFile(
      fileName,
      Directory.Data,
      true,
    );

    if (fileData.success) {
      try {
        // Decodifica la cadena Base64 en bytes binarios
        const binaryString = atob(fileData.data.data.toString());
        const binaryData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          binaryData[i] = binaryString.charCodeAt(i);
        }

        // Crea un Blob a partir de los datos binarios
        const blob = new Blob([binaryData], { type: 'image/png' });

        // Genera una URL de objeto que puedas usar en la etiqueta <img>
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error('Error leyendo la imagen como Blob:', error);
        return null;
      }
    }

    console.error('Error leyendo la imagen como Blob:', fileName);
    return null;
  }

  /**
   * Applies colors as CSS variables in the document.
   * @private
   * @param {ColorsModel} colors - Colors model to apply.
   */
  private applyColors(colors: ColorsModel): void {
    Object.keys(colors).forEach((key) => {
      const color = colors[key];
      const cssVarName = `--${key}`;

      if (color.type === 'HEX') {
        document.documentElement.style.setProperty(cssVarName, color.value);
      } else if (color.type === 'RGB') {
        const rgbValue = `rgb(${color.value.join(', ')})`;
        document.documentElement.style.setProperty(cssVarName, rgbValue);
      }
    });
  }

  /**
   * Sets the racimo path based on the session's racimo link code.
   * @private
   * @returns {Promise<boolean>} - Returns `true` if the racimo path is set, `false` otherwise.
   */
  private async getPathRacimo(): Promise<boolean> {
    const session = await this.session.getInfo();
    if (!session.racimoLinkCode) {
      return false;
    }
    this.pathRacimo = `${this.basePath}/${session.racimoLinkCode}`;
    return true;
  }
}
