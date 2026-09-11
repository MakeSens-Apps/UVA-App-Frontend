/**
 * B10 — UI primitives barrel export
 *
 * Shared UI components that replace the 4 Ionic controllers and the
 * two small components (ProgressBar / Day).
 */

export { ConfirmModal, useConfirmModal } from './ConfirmModal';
export type {
  ConfirmModalProps,
  ConfirmModalResult,
  ShowConfirmModalOptions,
} from './ConfirmModal';

export { UvaBottomSheet, UvaFullBottomSheet } from './BottomSheet';
export type {
  BottomSheetRef,
  UvaBottomSheetProps,
  UvaFullBottomSheetProps,
} from './BottomSheet';

export { showToast, hideToast, ToastComponent } from './Toast';
export type { ShowToastOptions, ToastType, ToastPosition } from './Toast';

export { LoadingOverlay, useLoadingOverlay } from './LoadingOverlay';
export type { LoadingOverlayProps } from './LoadingOverlay';

export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

export { Day } from './Day';
export type { DayProps, DayState, DayIconPosition } from './Day';
