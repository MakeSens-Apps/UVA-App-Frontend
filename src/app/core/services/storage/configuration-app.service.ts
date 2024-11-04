import { Injectable } from '@angular/core';
import { S3Service } from './s3/s3.service';
import { FileSystemService } from './file-system/file-system.service';
import { Directory } from '@capacitor/filesystem';
import { ConfigModel } from 'src/models/configuration/config.model';
import { ColorsModel } from 'src/models/configuration/colors.model';
import { MeasurementModel } from 'src/models/configuration/measurements.model';
//import { Config } from '@ionic/angular';

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
   */
  constructor(
    private s3: S3Service,
    private fileSystem: FileSystemService,
  ) {}

  /**
   * Downloads configuration data associated with a cluster code.
   * @param {string} racimoCode - Cluster code.
   * @returns {Promise<boolean>} - Returns `true` if all files were successfully downloaded, `false` if any failed.
   */
  async downLoadData(racimoCode: string): Promise<boolean> {
    const path = `${this.basePath}/${racimoCode}`;
    this.pathRacimo = path;
    const listFiles = await this.s3.listFiles(path);
    if (listFiles.success) {
      for (const item of listFiles.data) {
        const file = await this.s3.getFile(item.path);

        if (file.success) {
          await this.fileSystem.writeFile(
            item.path,
            file.data.content,
            Directory.Data,
          );
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
   * Retrieves the application configuration.
   * @returns {Promise<ConfigModel | null>} - Application configuration or `null` if not found.
   */
  async getConfigurationApp(): Promise<ConfigModel | null> {
    if (this.configApp === null) {
      const path = `public/racimos/NAT001/config.json`;
      const response = await this.fileSystem.readFile(path, Directory.Data);
      if (response.success) {
        try {
          this.configApp = JSON.parse(
            JSON.stringify(response.data.data),
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
    if (this.configMeasurement === null) {
      const path = `public/racimos/NAT001/measurementRegistration/measurementsRegistration.json`;
      const response = await this.fileSystem.readFile(path, Directory.Data);
      if (response.success) {
        this.configMeasurement = JSON.parse(
          JSON.stringify(response.data.data),
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
    if (this.configColors === null) {
      const path = `public/racimos/NAT001/branding/colors.json`;
      const response = await this.fileSystem.readFile(path, Directory.Data);
      if (response.success) {
        this.configColors = JSON.parse(
          JSON.stringify(response.data.data),
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
}
