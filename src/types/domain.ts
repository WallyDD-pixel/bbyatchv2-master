// Types de domaine centralisés pour réduire l'usage de `any` dans l'app/API.
// Étendre progressivement ce fichier (ne pas surcharger d'un coup).

export type DayPart = 'FULL' | 'AM' | 'PM';

export interface ExperienceCheckoutBody {
  expSlug: string;
  boatId: number;            // ID numérique (converti si string en entrée)
  start: string;             // YYYY-MM-DD
  end?: string;              // YYYY-MM-DD (optionnel si FULL sur un jour)
  part?: DayPart;            // défaut 'FULL'
  locale?: string;           // 'fr' | 'en'
  departurePort?: string;    // Port de départ
  preferredTime?: string;    // Horaire souhaité (HH:MM)
  children?: Array<{ age: number }>; // Enfants avec leurs âges
  specialRequest?: string;  // Demande spécifique
}

export interface ExperienceBasic {
  id: number;
  slug: string;
  titleFr: string | null;
  titleEn: string | null;
}

export interface BoatBasic {
  id: number;
}

export interface SettingsStripe {
  stripeMode: string | null;
  stripeTestSk: string | null;
  stripeLiveSk: string | null;
  currency: string | null;
  depositPercent?: number | null;
}

export interface ApiError {
  error: string;
}
