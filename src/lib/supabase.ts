import { createClient } from '@supabase/supabase-js';

// Récupérer les variables d'environnement avec valeurs par défaut pour le build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Vérification conditionnelle : seulement au runtime, pas pendant le build
function validateAndCreateClient() {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  // Vérifier que la clé n'est pas tronquée ou invalide
  if (serviceRoleKey.length < 200) {
    console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY seems too short. Service role keys are typically 200+ characters.');
    console.warn('  Current length:', serviceRoleKey.length);
    console.warn('  First 50 chars:', serviceRoleKey.substring(0, 50));
    console.warn('  Last 50 chars:', serviceRoleKey.substring(serviceRoleKey.length - 50));
  }

  return createClient(
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

// Client Supabase - création lazy pour éviter les erreurs au build
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    // Pendant le build, créer un client factice si les variables manquent
    if (!supabaseUrl || !serviceRoleKey) {
      // Créer un client factice pour le build
      _supabase = createClient(
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
      _supabase = validateAndCreateClient();
      // Log de configuration (sans exposer la clé complète)
      console.log('🔧 Supabase configuration:');
      console.log('  - URL:', supabaseUrl);
      console.log('  - Service Role Key length:', serviceRoleKey.length);
      console.log('  - Service Role Key starts with:', serviceRoleKey.substring(0, 20) + '...');
      console.log('  - Service Role Key ends with:', '...' + serviceRoleKey.substring(serviceRoleKey.length - 20));
    }
  }
  return _supabase;
}

// Export avec getter pour accès lazy
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  }
});

// Nom du bucket pour les uploads (configurable via env)
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';


