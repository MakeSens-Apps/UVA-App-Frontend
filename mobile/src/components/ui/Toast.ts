/**
 * B10 — Toast utilities
 *
 * Ported from: ToastController (IonToast) pattern used across the Ionic app
 *
 * Replaces:
 *   toastCtrl.create({ message, duration, position, color }) + present()
 *
 * Maps to:
 *   react-native-toast-message (Toast.show / Toast.hide)
 *
 * Contract:
 *   showToast(options) — replaces toastCtrl.create + present
 *   hideToast()        — replaces toastCtrl.dismiss
 *
 * Usage:
 *   1. Add <ToastComponent /> once near the root of the app (App.tsx)
 *   2. Call showToast() / hideToast() from any screen or service
 *
 * Risks addressed: R-44
 */

import Toast from 'react-native-toast-message';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';
export type ToastPosition = 'top' | 'bottom';

export interface ShowToastOptions {
  /** Message to display. */
  message: string;
  /**
   * Visual type. Maps from Ionic color:
   *   'success' — green (uva_green-500)
   *   'error'   — red/danger
   *   'info'    — blue (default)
   */
  type?: ToastType;
  /** Duration in milliseconds. Defaults to 3000. */
  duration?: number;
  /** Position on screen. Defaults to 'bottom'. */
  position?: ToastPosition;
  /** Optional secondary title line. */
  title?: string;
}

// ─── API ────────────────────────────────────────────────────────────────────────

/**
 * showToast
 *
 * Equivalent to:
 *   const toast = await toastCtrl.create({ message, duration, color, position });
 *   await toast.present();
 *
 * @example
 *   showToast({ message: 'Datos guardados', type: 'success' });
 *   showToast({ message: 'Error al sincronizar', type: 'error', duration: 5000 });
 */
export function showToast({
  message,
  type = 'info',
  duration = 3000,
  position = 'bottom',
  title,
}: ShowToastOptions): void {
  Toast.show({
    type,
    text1: title ?? message,
    text2: title ? message : undefined,
    position,
    visibilityTime: duration,
    autoHide: true,
  });
}

/**
 * hideToast
 *
 * Equivalent to: toast.dismiss() / toastCtrl.dismiss()
 */
export function hideToast(): void {
  Toast.hide();
}

// ─── Re-export Toast component for the root render ────────────────────────────

/**
 * ToastComponent
 *
 * Must be rendered exactly ONCE near the root of the app (App.tsx / NavigationContainer).
 * Provides the portal for Toast.show() to inject messages into.
 *
 * @example (App.tsx):
 *   import { ToastComponent } from '@/components/ui/Toast';
 *   ...
 *   return (
 *     <>
 *       <NavigationContainer>...</NavigationContainer>
 *       <ToastComponent />
 *     </>
 *   );
 */
export { default as ToastComponent } from 'react-native-toast-message';
