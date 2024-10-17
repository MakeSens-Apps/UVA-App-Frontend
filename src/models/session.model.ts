export interface Session {
    userID?: string;
    name?: string;
    lastName?: string;
    phone?: string;
    racimoID?: string;
    uvaID?: string;
    linkCode?: string;
  }
export const sessionKeys: Array<keyof Session> = [
  'userID', 
  'name', 
  'lastName', 
  'phone', 
  'racimoID', 
  'uvaID', 
  'linkCode'
];
  