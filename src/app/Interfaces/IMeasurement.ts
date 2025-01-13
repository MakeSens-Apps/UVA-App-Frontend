export interface IMeasurement {
  name: string;
  sortName?: string;
  unit: string;
  icon: {
    enable?: boolean;
    iconName?: string;
    colorName?: string;
    colorHex?: string;
    imagePath?: string;
  };
  backgroundColor: {
    colorHex: string;
  };
  borderColor: {
    colorHex: string;
  };
  value?: number;
  fields?: number;
  fieldsArray?: string[];
  range?: {
    min: number;
    max: number;
    optionalMessage?: string;
  };
}
