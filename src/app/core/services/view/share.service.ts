import { Injectable } from '@angular/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Platform } from '@ionic/angular';

interface WebShareAPI {
  share(data: { title?: string; text?: string; url?: string }): Promise<void>;
}

interface NavigatorWithClipboard {
  clipboard: {
    writeText(text: string): Promise<void>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ShareService {
  /**
   * Constructor for ShareService
   * @param {Platform} platform - Ionic platform service
   */
  constructor(private platform: Platform) {}

  /**
   * Shares an environmental report image
   * @param {string} imageDataUrl - The base64 data URL of the image
   * @param {string} month - The month string for the report
   * @returns {Promise<void>}
   */
  async shareReportImage(imageDataUrl: string, month: string): Promise<void> {
    try {
      console.log('Platform detection:', {
        isCapacitor: this.platform.is('capacitor'),
        isAndroid: this.platform.is('android'),
        isIOS: this.platform.is('ios'),
        isMobile: this.platform.is('mobile')
      });

      console.log('Image data URL length:', imageDataUrl.length);
      console.log('Image data URL prefix:', imageDataUrl.substring(0, 50));

      if (this.platform.is('capacitor')) {
        console.log('Using Capacitor share for mobile...');

        // Validate data URL
        if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
          throw new Error('Invalid image data URL provided');
        }

        // Convertir data URL a blob y luego a base64 puro
        const base64Data = imageDataUrl.split(',')[1];
        if (!base64Data) {
          throw new Error('Could not extract base64 data from image URL');
        }

        console.log('Base64 data length:', base64Data.length);

        // Crear nombre de archivo
        const fileName = `reporte_ambiental_${month.replace(/\s+/g, '_').toLowerCase()}.png`;
        console.log('File name:', fileName);

        // Guardar imagen temporalmente
        console.log('Saving file to cache...');
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true
        });

        console.log('File saved successfully:', savedFile);

        // Obtener URI del archivo
        const fileUri = savedFile.uri;
        console.log('File URI:', fileUri);

        // Verificar que el archivo existe
        const fileInfo = await Filesystem.stat({
          path: fileName,
          directory: Directory.Cache
        });
        console.log('File verification:', fileInfo);

        // Compartir usando Capacitor Share
        console.log('Starting share...');
        const shareOptions = {
          title: `Reporte de Datos Ambientales - ${month}`,
          text: `Reporte de datos ambientales generado por App UVA para el mes de ${month}`,
          url: fileUri,
          dialogTitle: 'Compartir reporte ambiental'
        };
        console.log('Share options:', shareOptions);

        await Share.share(shareOptions);
        console.log('Share completed successfully');

        // Limpiar archivo temporal después de un tiempo
        setTimeout(() => {
          void (async () => {
            try {
              await Filesystem.deleteFile({
                path: fileName,
                directory: Directory.Cache
              });
              console.log('Temporary file cleaned up');
            } catch (error) {
              console.warn('Error cleaning up temporary file:', error);
            }
          })();
        }, 30000); // 30 segundos - más tiempo para que se complete el share

      } else {
        console.log('Using web fallback...');
        // Fallback para web - abrir imagen en nueva ventana
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>Reporte de Datos Ambientales - ${month}</title></head>
              <body style="margin: 0; padding: 20px; text-align: center;">
                <h2>Reporte de Datos Ambientales - ${month}</h2>
                <p>Haz clic derecho en la imagen y selecciona "Guardar imagen como..." para descargarla</p>
                <img src="${imageDataUrl}" style="max-width: 100%; height: auto;" alt="Reporte de Datos Ambientales">
                <br><br>
                <a href="${imageDataUrl}" download="reporte_ambiental_${month.replace(/\s+/g, '_').toLowerCase()}.png">
                  <button style="padding: 10px 20px; font-size: 16px; background: #14788a; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Descargar Imagen
                  </button>
                </a>
              </body>
            </html>
          `);
        } else {
          throw new Error('No se pudo abrir una nueva ventana. Verifica que los pop-ups estén habilitados.');
        }
      }
    } catch (error) {
      console.error('Error al compartir reporte:', error);
      throw new Error(`No se pudo compartir el reporte: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if sharing is available on the current platform
   * @returns {Promise<boolean>} True if sharing is available
   */
  async canShare(): Promise<boolean> {
    try {
      if (this.platform.is('capacitor')) {
        // En dispositivos móviles, Share está disponible
        return true;
      } else {
        // En web, verificar si el navegador soporta Web Share API
        return 'share' in navigator;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Shares text content with optional URL
   * @param {string} title - The title for the share dialog
   * @param {string} text - The text content to share
   * @param {string} url - Optional URL to include
   * @returns {Promise<void>}
   */
  async shareText(title: string, text: string, url?: string): Promise<void> {
    try {
      if (this.platform.is('capacitor')) {
        await Share.share({
          title,
          text,
          url,
          dialogTitle: 'Compartir'
        });
      } else if ('share' in navigator) {
        // Web Share API
        await (navigator as unknown as WebShareAPI).share({
          title,
          text,
          url
        });
      } else {
        // Fallback - copiar al portapapeles o mostrar modal
        const fullText = url ? `${text}\n${url}` : text;
        if ('clipboard' in navigator) {
          await (navigator as NavigatorWithClipboard).clipboard.writeText(fullText);
        }
      }
    } catch (error) {
      console.error('Error al compartir texto:', error);
      throw error;
    }
  }
}