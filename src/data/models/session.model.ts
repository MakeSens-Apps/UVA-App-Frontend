/**
 * B04 — Session model
 * Ported from: src/models/session.model.ts
 * Classification: Reusable as-is
 * Changes: none (import path only)
 */

export interface Session {
  userID?: string;
  name?: string;
  lastName?: string;
  phone?: string;
  racimoID?: string;
  uvaID?: string;
  racimoName?: string;
  racimoLinkCode?: string;
  racimoConfiguration?: string;
}

export const sessionKeys: (keyof Session)[] = [
  'userID',
  'name',
  'lastName',
  'phone',
  'racimoID',
  'uvaID',
  'racimoName',
  'racimoLinkCode',
  'racimoConfiguration',
];
