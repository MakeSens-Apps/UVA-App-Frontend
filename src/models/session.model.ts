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
];
