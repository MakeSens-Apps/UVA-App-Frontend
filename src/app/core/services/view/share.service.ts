import { Injectable } from '@angular/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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
  providedIn: 'root',
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
      if (this.platform.is('capacitor')) {
        // Validate data URL
        if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
          throw new Error('Invalid image data URL provided');
        }

        // Convertir data URL a blob y luego a base64 puro
        const base64Data = imageDataUrl.split(',')[1];
        if (!base64Data) {
          throw new Error('Could not extract base64 data from image URL');
        }

        // Verificar tamaño de datos para Android (límite aproximado: 1MB)
        if (this.platform.is('android') && base64Data.length > 1400000) {
          console.warn(
            '[ShareService] Image too large for Android, may cause issues',
          );
        }

        // Crear nombre de archivo con timestamp para evitar conflictos
        const timestamp = Date.now();
        const fileName = `reporte_ambiental_${month.replace(/\s+/g, '_').toLowerCase()}_${timestamp}.png`;

        let savedFile;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            savedFile = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Cache,
              recursive: true,
            });
            break;
          } catch (writeError) {
            retryCount++;
            console.warn(
              `[ShareService] File write attempt ${retryCount} failed:`,
              writeError,
            );

            if (retryCount >= maxRetries) {
              throw new Error(
                `Failed to save file after ${maxRetries} attempts: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`,
              );
            }

            // Wait before retry (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount),
            );
          }
        }

        if (!savedFile) {
          throw new Error('Could not save file after retries');
        }

        // Obtener URI del archivo
        const fileUri = savedFile.uri;

        // Verificar que el archivo existe
        try {
          const fileInfo = await Filesystem.stat({
            path: fileName,
            directory: Directory.Cache,
          });
        } catch (statError) {
          console.warn(
            '[ShareService] File verification failed, but proceeding:',
            statError,
          );
        }

        // Compartir usando Capacitor Share con configuración optimizada para Android
        const shareOptions = {
          title: `Reporte de Datos Ambientales - ${month}`,
          text: `Reporte de datos ambientales generado por App UVA para el mes de ${month}`,
          url: fileUri,
          dialogTitle: 'Compartir reporte ambiental',
        };

        // Agregar files array específicamente para Android
        if (this.platform.is('android')) {
          (shareOptions as typeof shareOptions & { files?: string[] }).files = [
            fileUri,
          ];
        }

        try {
          await Share.share(shareOptions);
        } catch (shareError) {
          console.error('[ShareService] Share failed:', shareError);

          // Intentar compartir solo con URL si falló el share completo
          if (this.platform.is('android')) {
            try {
              await Share.share({
                url: fileUri,
                dialogTitle: 'Compartir reporte',
              });
            } catch (fallbackShareError) {
              console.error(
                '[ShareService] Fallback share also failed:',
                fallbackShareError,
              );
              throw shareError; // Throw original error
            }
          } else {
            throw shareError;
          }
        }

        // Limpiar archivo temporal después de un tiempo (más largo para Android)
        const cleanupDelay = this.platform.is('android') ? 60000 : 30000; // 60s for Android, 30s for others
        setTimeout(() => {
          void (async () => {
            try {
              await Filesystem.deleteFile({
                path: fileName,
                directory: Directory.Cache,
              });
            } catch (error) {
              console.warn(
                '[ShareService] Error cleaning up temporary file:',
                error,
              );
            }
          })();
        }, cleanupDelay);
      } else {
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
          throw new Error(
            'No se pudo abrir una nueva ventana. Verifica que los pop-ups estén habilitados.',
          );
        }
      }
    } catch (error) {
      console.error('[ShareService] Error al compartir reporte:', error);
      throw new Error(
        `No se pudo compartir el reporte: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Checks if sharing is available on the current platform
   * @returns {Promise<boolean>} True if sharing is available
   */
  async canShare(): Promise<boolean> {
    try {
      if (this.platform.is('capacitor')) {
        // Verificar que el plugin Share esté disponible
        if (typeof Share === 'undefined') {
          console.error('[ShareService] canShare - Share plugin not available');
          return false;
        }
        return true;
      } else {
        const hasWebShare = 'share' in navigator;
        return hasWebShare;
      }
    } catch (error) {
      console.error('[ShareService] canShare - Error during check:', error);
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
          dialogTitle: 'Compartir',
        });
      } else if ('share' in navigator) {
        // Web Share API
        await (navigator as unknown as WebShareAPI).share({
          title,
          text,
          url,
        });
      } else {
        // Fallback - copiar al portapapeles o mostrar modal
        const fullText = url ? `${text}\n${url}` : text;
        if ('clipboard' in navigator) {
          await (navigator as NavigatorWithClipboard).clipboard.writeText(
            fullText,
          );
        }
      }
    } catch (error) {
      console.error('Error al compartir texto:', error);
      throw error;
    }
  }
}
