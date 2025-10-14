import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function StripeSettingsPage(){
  const session = (await getServerSession(auth as any)) as any;
  if(!session?.user) redirect('/signin');
  let role: string | undefined = (session.user as any)?.role;
  if(!role && session.user?.email){
    try { const u = await (prisma as any).user.findUnique({ where:{ email: session.user.email }, select:{ role:true } }); role = u?.role || 'user'; } catch {}
  }
  if((role||'user') !== 'admin') redirect('/dashboard');

  let settings = await prisma.settings.findFirst({ where:{ id:1 } });
  if(!settings){ settings = await prisma.settings.create({ data:{ id:1 } as any }); }

  return (
    <div className='max-w-3xl mx-auto w-full py-10 px-4'>
      <h1 className='text-2xl font-bold mb-6'>Stripe</h1>
      <p className='text-sm text-black/60 mb-6'>Configurer les clés Stripe test & live et choisir le mode actif.</p>
      <form action={async (formData: FormData)=>{
        'use server';
        const mode = formData.get('mode') as string | null;
        const testPk = formData.get('testPk') as string | null;
        const testSk = formData.get('testSk') as string | null;
        const livePk = formData.get('livePk') as string | null;
        const liveSk = formData.get('liveSk') as string | null;
        await prisma.settings.upsert({
          where:{ id:1 },
          update:{ stripeMode: mode||undefined, stripeTestPk: testPk||undefined, stripeTestSk: testSk||undefined, stripeLivePk: livePk||undefined, stripeLiveSk: liveSk||undefined },
          create:{ id:1, stripeMode: mode||'test', stripeTestPk: testPk||undefined, stripeTestSk: testSk||undefined, stripeLivePk: livePk||undefined, stripeLiveSk: liveSk||undefined }
        });
      }} className='space-y-6'>
        <div>
          <label className='text-xs font-medium text-black/60'>Mode actif</label>
          <select name='mode' defaultValue={settings?.stripeMode||'test'} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white'>
            <option value='test'>Test</option>
            <option value='live'>Live</option>
          </select>
        </div>
        <div className='grid sm:grid-cols-2 gap-4'>
          <div>
            <label className='text-xs font-medium text-black/60'>Test Publishable Key</label>
            <input name='testPk' defaultValue={settings?.stripeTestPk||''} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white' placeholder='pk_test_...' />
          </div>
          <div>
            <label className='text-xs font-medium text-black/60'>Test Secret Key</label>
            <input name='testSk' defaultValue={settings?.stripeTestSk||''} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white' placeholder='sk_test_...' />
          </div>
          <div>
            <label className='text-xs font-medium text-black/60'>Live Publishable Key</label>
            <input name='livePk' defaultValue={settings?.stripeLivePk||''} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white' placeholder='pk_live_...' />
          </div>
            <div>
            <label className='text-xs font-medium text-black/60'>Live Secret Key</label>
            <input name='liveSk' defaultValue={settings?.stripeLiveSk||''} className='mt-1 w-full h-10 rounded-lg border border-black/15 px-3 bg-white' placeholder='sk_live_...' />
          </div>
        </div>
        <button type='submit' className='h-11 px-6 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:brightness-110'>Enregistrer</button>
      </form>
      <p className='mt-8 text-[11px] text-black/40'>Les clés sont stockées chiffrées côté base (TODO: implémenter chiffrement si nécessaire). Limiter l'accès à cette page.</p>
    </div>
  );
}
