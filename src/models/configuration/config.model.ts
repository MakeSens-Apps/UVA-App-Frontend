// Interface para el objeto "racimo"
interface RacimoModel {
  id: string;
  name: string;
  linkageCode: string;
}

// Interface para el objeto "branding"
interface BrandingModel {
  colors: {
    path: string;
  };
  logo: string;
}

// Interface para cada campo en "fieldsUVA"
interface Field {
  enabled: boolean;
  fieldId: string;
  displayText: string;
}

// Interface para el objeto "fieldsUVA", usando Record para los campos
type FieldsUVA = Record<string, Field>;

// Interface para el objeto "measurementRegistration"
interface MeasurementRegistration {
  path: string;
}

// Interface para el objeto "gamification" -> "streakReward"
interface StreakReward {
  streakDaysRequired: number;
  seedsForStreak: number;
}

// Interface para cada "milestone" en "gamification"
interface MilestoneModel {
  name: string;
  lowerBound: number | null;
  upperBound: number | null;
  icon: string;
}

// Interface para el objeto "gamification"
interface GamificationModel {
  seedIcon: string;
  seedsToRecoverStreak: number;
  seedsForAllTasks: number;
  seedsForOneTask: number;
  streakReward: StreakReward;
  streakIcons: Record<string, string>; // Usado para "streakIcons" vacío
  milestones: Record<string, MilestoneModel>;
}

// Interface principal que agrupa todos los objetos anteriores
export interface ConfigModel {
  racimo: RacimoModel;
  branding: BrandingModel;
  fieldsUVA: FieldsUVA;
  measurementRegistration: MeasurementRegistration;
  components: Record<string, boolean>;
  documentation: string;
  gamification: GamificationModel;
}
