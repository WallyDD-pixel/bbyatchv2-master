import { createClient } from '@supabase/supabase-js';

// Récupérer les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Créer le client Supabase directement
// Si les variables manquent au build, on crée un client factice
let supabaseClient: ReturnType<typeof createClient>;

try {
  if (!supabaseUrl || !serviceRoleKey) {
    // Client factice pour le build si les variables manquent
    supabaseClient = createClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  } else {
    // Client réel avec les vraies variables
    supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
} catch (error) {
  // En cas d'erreur, créer un client factice
  console.error('Error creating Supabase client:', error);
  supabaseClient = createClient(
    'https://placeholder.supabase.co',
    'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export const supabase = supabaseClient;

// Nom du bucket pour les uploads (configurable via env)
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';


