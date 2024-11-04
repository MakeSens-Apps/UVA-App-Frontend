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
  constructor(
    private s3: S3Service,
    private fileSystem: FileSystemService,
  ) {}

  async downLoadData(racimoCode: string): Promise<boolean> {
    const path = `${this.basePath}/${racimoCode}`;
    this.pathRacimo = path;
    const listFiles = await this.s3.listFiles(path);
    if (listFiles.success) {
      for (const item of listFiles.data) {
        console.log(item.path);
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

  async getConfigurationApp(): Promise<ConfigModel | null> {
    if (this.configApp === null) {
      const path = `public/racimos/NAT001/config.json`;
      const response = await this.fileSystem.readFile(path, Directory.Data);
      if (response.success) {
        console.log(response.data);
        try {
          console.log(typeof response.data.data === 'object');
          this.configApp = JSON.parse(
            JSON.stringify(response.data.data),
          ) as ConfigModel;
        } catch (err) {
          console.error('No parce ConfigModel');
          console.error(err);
        }
      } else {
        this.configApp = null;
      }
    }
    return this.configApp;
  }

  async getConfigurationMeasurement(): Promise<MeasurementModel | null> {
    if (this.configMeasurement === null) {
      const path = `public/racimos/NAT001/measurementRegistration/measurementsRegistration.json`;
      const response = await this.fileSystem.readFile(path, Directory.Data);
      if (response.success) {
        console.log(response.data);
        this.configMeasurement = JSON.parse(
          JSON.stringify(response.data.data),
        ) as MeasurementModel;
      } else {
        this.configMeasurement = null;
      }
    }
    return this.configMeasurement;
  }

  async getConfigurationColors(): Promise<ColorsModel | null> {
    if (this.configColors === null) {
      const path = `public/racimos/NAT001/branding/colors.json`;
      const response = await this.fileSystem.readFile(path, Directory.Data);
      if (response.success) {
        console.log(response.data);
        this.configColors = JSON.parse(
          JSON.stringify(response.data.data),
        ) as ColorsModel;
      } else {
        this.configColors = null;
      }
    }
    return this.configColors;
  }

  async loadBranding(): Promise<void> {
    const colors = await this.getConfigurationColors();
    if (colors !== null) {
      this.applyColors(colors);
    } else {
      console.error('No BrandingColors');
    }
  }
  // Método para aplicar los colores como variables CSS
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
