import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';

export default async function AdminUsedBoatsPage({ searchParams }: { searchParams?: { lang?: string } }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  if((session.user as any)?.role !== 'admin') redirect('/dashboard');
  const sp = searchParams || {};
  const locale: Locale = sp?.lang==='en'? 'en':'fr';
  const t = messages[locale];
  let boats: any[] = [];
  try {
    boats = await (prisma as any).usedBoat.findMany({ orderBy:[{ sort:'asc' }, { createdAt:'desc' }], take:200 });
  } catch{}
  const money = (v:number)=> (v/1).toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €';
  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale==='fr'? 'Bateaux d\'occasion':'Used boats'}</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale==='fr'? 'Retour':'Back'}</Link>
            <Link href="/admin/used-boats/new" className="text-sm rounded-full bg-[color:var(--primary)] text-white px-3 h-9 inline-flex items-center hover:opacity-90">{locale==='fr'? 'Nouveau':'New'}</Link>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm align-middle">
            <thead>
              <tr className="text-left text-black/70 bg-black/[0.035]">
                <th className="py-2.5 px-3">Slug</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Titre FR':'Title FR'}</th>
                <th className="py-2.5 px-3">Année</th>
                <th className="py-2.5 px-3">m</th>
                <th className="py-2.5 px-3">Prix</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Actions':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {boats.length===0 && <tr><td colSpan={7} className="py-8 text-center text-black/60">{locale==='fr'? 'Aucun bateau.':'No boats.'}</td></tr>}
              {boats.map(b=> (
                <tr key={b.id} className="border-t border-black/10 hover:bg-black/[0.03]">
                  <td className="py-2.5 px-3 text-[11px] text-black/60">{b.slug}</td>
                  <td className="py-2.5 px-3">{b.titleFr}</td>
                  <td className="py-2.5 px-3">{b.year}</td>
                  <td className="py-2.5 px-3">{b.lengthM}</td>
                  <td className="py-2.5 px-3 text-right">{money(b.priceEur)}</td>
                  <td className="py-2.5 px-3"><span className={`inline-flex items-center rounded-full px-2.5 h-6 text-[10px] font-semibold ${b.status==='listed'? 'bg-emerald-100 text-emerald-700': b.status==='sold'? 'bg-red-100 text-red-700':'bg-black/10 text-black/60'}`}>{b.status}</span></td>
                  <td className="py-2.5 px-3"><Link href={`/admin/used-boats/${b.id}`} className="text-[11px] rounded-full border border-black/15 px-3 h-7 inline-flex items-center hover:bg-black/5">{locale==='fr'? 'Éditer':'Edit'}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
