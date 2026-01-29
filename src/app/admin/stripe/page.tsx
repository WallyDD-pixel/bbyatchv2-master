import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminInstructions from '@/components/AdminInstructions';

export default async function StripeSettingsPage(){
  const session = await getServerSession() as any;
  if(!session?.user) redirect('/signin');
  let role: string | undefined = (session.user as any)?.role;
  if(!role && session.user?.email){
    try { const u = await (prisma as any).user.findUnique({ where:{ email: session.user.email }, select:{ role:true } }); role = u?.role || 'user'; } catch {}
  }
  if((role||'user') !== 'admin') redirect('/dashboard');

  let settings = await (prisma as any).settings.findFirst({ where:{ id:1 } });
  if(!settings){ settings = await (prisma as any).settings.create({ data:{ id:1 } as any }); }

  return (
    <div className='max-w-3xl mx-auto w-full py-10 px-4'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold mb-4'>Stripe</h1>
        <AdminInstructions
          locale="fr"
          title="Comment configurer Stripe"
          instructions={[
            {
              title: "Mode Test vs Live",
              description: "Sélectionnez 'Test' pour les paiements de test avec des cartes de test, ou 'Live' pour les paiements réels en production."
            },
            {
              title: "Clés de test",
              description: "Les clés de test (pk_test_... et sk_test_...) sont utilisées en mode test. Vous pouvez les obtenir depuis votre tableau de bord Stripe en mode test."
            },
            {
              title: "Clés de production",
              description: "Les clés de production (pk_live_... et sk_live_...) sont utilisées en mode live. Ne les utilisez qu'en production et gardez-les secrètes."
            },
            {
              title: "Sécurité",
              description: "Les clés secrètes (sk_...) ne doivent jamais être exposées côté client. Elles sont stockées côté serveur uniquement."
            },
            {
              title: "Tester les paiements",
              description: "En mode test, utilisez les cartes de test Stripe (ex: 4242 4242 4242 4242) pour simuler des paiements sans frais réels."
            },
            {
              title: "Webhook Secrets",
              description: "Les secrets webhook (whsec_...) sont utilisés pour vérifier l'authenticité des événements Stripe. Vous pouvez les obtenir depuis votre tableau de bord Stripe > Développeurs > Webhooks. Configurez l'URL du webhook sur: https://votre-domaine.com/api/payments/webhook"
            }
          ]}
        />
      </div>
      <form action={async (formData: FormData)=>{
        'use server';
        const mode = formData.get('mode') as string | null;
        const testPk = formData.get('testPk') as string | null;
        const testSk = formData.get('testSk') as string | null;
        const testWebhook = formData.get('testWebhook') as string | null;
        const livePk = formData.get('livePk') as string | null;
        const liveSk = formData.get('liveSk') as string | null;
        const liveWebhook = formData.get('liveWebhook') as string | null;
        await prisma.settings.upsert({
          where:{ id:1 },
          update:{ 
            stripeMode: mode||undefined, 
            stripeTestPk: testPk||undefined, 
            stripeTestSk: testSk||undefined, 
            stripeTestWebhookSecret: testWebhook||undefined,
            stripeLivePk: livePk||undefined, 
            stripeLiveSk: liveSk||undefined,
            stripeLiveWebhookSecret: liveWebhook||undefined
          },
          create:{ 
            id:1, 
            stripeMode: mode||'test', 
            stripeTestPk: testPk||undefined, 
            stripeTestSk: testSk||undefined, 
            stripeTestWebhookSecret: testWebhook||undefined,
            stripeLivePk: livePk||undefined, 
            stripeLiveSk: liveSk||undefined,
            stripeLiveWebhookSecret: liveWebhook||undefined
          }
        });
      }} className='space-y-6'>
        <div>
          <label className='text-xs font-medium text-black/60'>Mode actif</label>
          <select name='mode' defaultValue={settings?.stripeMode||'test'} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white'>
            <option value='test'>Test</option>
            <option value='live'>Live</option>
          </select>
        </div>
        <div className='space-y-4'>
          <div className='grid sm:grid-cols-2 gap-4'>
            <div>
              <label className='text-xs font-medium text-black/60'>Test Publishable Key</label>
              <input name='testPk' defaultValue={settings?.stripeTestPk||''} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white' placeholder='pk_test_...' />
            </div>
            <div>
              <label className='text-xs font-medium text-black/60'>Test Secret Key</label>
              <input name='testSk' type='password' defaultValue={settings?.stripeTestSk||''} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white' placeholder='sk_test_...' />
            </div>
            <div>
              <label className='text-xs font-medium text-black/60'>Test Webhook Secret</label>
              <input name='testWebhook' type='password' defaultValue={settings?.stripeTestWebhookSecret||''} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white' placeholder='whsec_...' />
              <p className='mt-1 text-[10px] text-black/40'>Secret du webhook Stripe en mode test (whsec_...)</p>
            </div>
          </div>
          <div className='grid sm:grid-cols-2 gap-4'>
            <div>
              <label className='text-xs font-medium text-black/60'>Live Publishable Key</label>
              <input name='livePk' defaultValue={settings?.stripeLivePk||''} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white' placeholder='pk_live_...' />
            </div>
            <div>
              <label className='text-xs font-medium text-black/60'>Live Secret Key</label>
              <input name='liveSk' type='password' defaultValue={settings?.stripeLiveSk||''} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white' placeholder='sk_live_...' />
            </div>
            <div>
              <label className='text-xs font-medium text-black/60'>Live Webhook Secret</label>
              <input name='liveWebhook' type='password' defaultValue={settings?.stripeLiveWebhookSecret||''} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white' placeholder='whsec_...' />
              <p className='mt-1 text-[10px] text-black/40'>Secret du webhook Stripe en mode live (whsec_...)</p>
            </div>
          </div>
        </div>
        <button type='submit' className='h-11 px-6 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold inline-flex items-center transition-all duration-200 shadow-sm hover:shadow' style={{ backgroundColor: '#2563eb' }}>Enregistrer</button>
      </form>
      <p className='mt-8 text-[11px] text-black/40'>Les clés sont stockées chiffrées côté base (TODO: implémenter chiffrement si nécessaire). Limiter l'accès à cette page.</p>
    </div>
  );
}
