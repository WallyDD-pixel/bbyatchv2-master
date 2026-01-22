import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Vérifier que la clé n'est pas tronquée ou invalide
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceRoleKey.length < 200) {
  console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY seems too short. Service role keys are typically 200+ characters.');
  console.warn('  Current length:', serviceRoleKey.length);
  console.warn('  First 50 chars:', serviceRoleKey.substring(0, 50));
  console.warn('  Last 50 chars:', serviceRoleKey.substring(serviceRoleKey.length - 50));
}

// Client Supabase avec Service Role Key pour les opérations serveur (upload, etc.)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Log de configuration (sans exposer la clé complète)
console.log('🔧 Supabase configuration:');
console.log('  - URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('  - Service Role Key length:', serviceRoleKey.length);
console.log('  - Service Role Key starts with:', serviceRoleKey.substring(0, 20) + '...');
console.log('  - Service Role Key ends with:', '...' + serviceRoleKey.substring(serviceRoleKey.length - 20));

// Nom du bucket pour les uploads (configurable via env)
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';


