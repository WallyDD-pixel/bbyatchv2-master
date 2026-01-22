// Script de test pour vérifier la configuration Supabase
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Lire le fichier .env manuellement
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.+?)"?$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
  }
});

console.log('🔍 Vérification de la configuration Supabase...\n');

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = envVars.SUPABASE_STORAGE_BUCKET || 'uploads';

console.log('📋 Configuration:');
console.log('  - URL:', supabaseUrl || '❌ MANQUANT');
console.log('  - Service Role Key length:', serviceRoleKey ? serviceRoleKey.length : '❌ MANQUANT');
console.log('  - Service Role Key starts with:', serviceRoleKey ? serviceRoleKey.substring(0, 30) + '...' : '❌ MANQUANT');
console.log('  - Service Role Key ends with:', serviceRoleKey ? '...' + serviceRoleKey.substring(serviceRoleKey.length - 30) : '❌ MANQUANT');
console.log('  - Bucket:', bucketName);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('\n❌ Configuration incomplète !');
  process.exit(1);
}

if (serviceRoleKey.length < 200) {
  console.warn('\n⚠️ ATTENTION: La clé Service Role semble trop courte !');
  console.warn('   Les clés service_role font généralement 200+ caractères.');
  console.warn('   Vérifiez que vous avez copié la clé complète depuis Supabase Dashboard.');
}

console.log('\n🔌 Test de connexion Supabase...');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test 1: Lister les buckets
console.log('\n📦 Test 1: Liste des buckets...');
supabase.storage.listBuckets()
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Erreur lors de la liste des buckets:', error.message);
      console.error('   Code:', error.statusCode);
      if (error.statusCode === 403) {
        console.error('   ⚠️ Erreur 403 = La clé API est invalide ou n\'a pas les permissions nécessaires');
        console.error('   Vérifiez que vous utilisez la clé "service_role" (pas "anon")');
      }
    } else {
      console.log('✅ Buckets disponibles:', data?.map(b => b.name).join(', ') || 'Aucun');
      const bucketExists = data?.some(b => b.name === bucketName);
      if (bucketExists) {
        console.log(`✅ Le bucket "${bucketName}" existe`);
      } else {
        console.warn(`⚠️ Le bucket "${bucketName}" n'existe pas`);
        console.warn('   Créez-le dans Supabase Dashboard → Storage');
      }
    }
    
    // Test 2: Upload d'un fichier de test
    console.log('\n📤 Test 2: Upload d\'un fichier de test...');
    const testContent = Buffer.from('test');
    const testPath = `test/${Date.now()}-test.txt`;
    
    return supabase.storage
      .from(bucketName)
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: false
      });
  })
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Erreur lors de l\'upload:', error.message);
      console.error('   Code:', error.statusCode);
      if (error.statusCode === 403) {
        console.error('   ⚠️ Erreur 403 = La clé API est invalide');
        console.error('\n💡 Solutions:');
        console.error('   1. Allez sur https://supabase.com/dashboard');
        console.error('   2. Sélectionnez votre projet');
        console.error('   3. Settings → API');
        console.error('   4. Copiez la clé "service_role" (pas "anon")');
        console.error('   5. Collez-la dans le fichier .env');
        console.error('   6. Redémarrez le serveur (npm run dev)');
      }
    } else {
      console.log('✅ Upload réussi !');
      console.log('   Path:', data?.path);
    }
  })
  .catch((err) => {
    console.error('❌ Erreur inattendue:', err.message);
  });
