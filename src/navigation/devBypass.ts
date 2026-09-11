/**
 * @deprecated Superseded by ./navigationGate.
 *
 * This module historically held the DEV-only bypass setter. The mechanism has
 * been generalized into navigationGate.ts (the real Auth↔App transition path used
 * by register/login/vinculation, not just DEV). This file re-exports the
 * compatibility aliases so any older import keeps working.
 */

export { registerDevBypassSetter, devBypassToApp } from './navigationGate';
