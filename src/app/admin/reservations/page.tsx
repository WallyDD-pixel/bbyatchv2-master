import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import ReservationsTableClient from './ReservationsTableClient';

// Action serveur pour changer le statut
async function updateReservationStatus(formData: FormData){
  'use server';
  const session = await getServerSession(auth as any) as any;
  if(!session?.user){ redirect('/signin'); }
  const role = (session.user as any)?.role || 'user';
  if(role !== 'admin') redirect('/dashboard');
  const id = formData.get('id') as string|undefined;
  const newStatus = formData.get('status') as string|undefined;
  if(!id || !newStatus) return;
  const allowed = new Set(['pending_deposit','deposit_paid','completed','cancelled']);
  if(!allowed.has(newStatus)) return;
  try {
    const data: any = { status: newStatus };
    if(newStatus === 'deposit_paid'){ data.depositPaidAt = new Date(); }
    if(newStatus === 'completed'){ data.completedAt = new Date(); }
    if(newStatus === 'cancelled'){ data.canceledAt = new Date(); }
    await prisma.reservation.update({ where:{ id }, data });
  } catch(e){ console.error(e); }
  revalidatePath('/admin/reservations');
}

// Action serveur pour mettre à jour le montant final du carburant
async function updateFinalFuelAmount(formData: FormData){
  'use server';
  const session = await getServerSession(auth as any) as any;
  if(!session?.user){ redirect('/signin'); }
  const role = (session.user as any)?.role || 'user';
  if(role !== 'admin') redirect('/dashboard');
  const id = formData.get('id') as string|undefined;
  const fuelAmountStr = formData.get('finalFuelAmount') as string|undefined;
  if(!id) return;
  try {
    const finalFuelAmount = fuelAmountStr ? Math.max(0, parseInt(fuelAmountStr, 10) || 0) : null;
    await (prisma as any).reservation.update({ 
      where:{ id }, 
      data: { finalFuelAmount } 
    });
  } catch(e){ console.error(e); }
  revalidatePath('/admin/reservations');
}

// Action serveur pour supprimer des réservations
async function deleteReservations(ids: string[]){
  'use server';
  const session = await getServerSession(auth as any) as any;
  if(!session?.user){ redirect('/signin'); }
  const role = (session.user as any)?.role || 'user';
  if(role !== 'admin') redirect('/dashboard');
  if(!ids || ids.length === 0) return;
  try {
    await (prisma as any).reservation.deleteMany({
      where: { id: { in: ids } }
    });
  } catch(e){ console.error(e); }
  revalidatePath('/admin/reservations');
}

export default async function AdminReservationsPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = (sp.lang === "en") ? "en" : "fr";
  const t = messages[locale];

  let reservations: any[] = [];
  try {
    reservations = await (prisma as any).reservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user:{ select:{ email:true, firstName:true, lastName:true } }, boat:{ select:{ name:true, slug:true } } },
      select: undefined // Récupérer tous les champs y compris finalFuelAmount
    });
  } catch {}

  // Compteur bateaux d'occasion
  let usedBoatCount = 0;
  try { usedBoatCount = await (prisma as any).usedBoat.count(); } catch {}

  const dateFmt = (d: Date) => d.toISOString().slice(0,10);
  const dayCount = (r:any) => { const s=new Date(r.startDate), e=new Date(r.endDate); return Math.round((e.getTime()-s.getTime())/86400000)+1; };
  const partLabel = (p:string|null|undefined) => p==='FULL'? (locale==='fr'? 'Journée entière':'Full day') : p==='AM'? (locale==='fr'? 'Matin':'Morning') : p==='PM'? (locale==='fr'? 'Après-midi':'Afternoon') : '—';
  const money = (v:number|undefined|null)=> v==null? '—' : (v/1).toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €';
  const statusLabel = (s:string)=>{
    switch(s){
      case 'pending_deposit': return locale==='fr'? 'Acompte en attente':'Deposit pending';
      case 'deposit_paid': return locale==='fr'? 'Acompte payé':'Deposit paid';
      case 'completed': return locale==='fr'? 'Terminée':'Completed';
      case 'cancelled': return locale==='fr'? 'Annulée':'Cancelled';
      default: return s;
    }
  };
  const badgeClass = (s:string)=>{
    switch(s){
      case 'deposit_paid': return 'bg-emerald-100 text-emerald-700';
      case 'pending_deposit': return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-black/10 text-black/60';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Réservations" : "Reservations"}</h1>
          <div className="flex items-center gap-2">
            <Link href={`/admin/reservations/new${locale==='en'? '?lang=en':''}`} className="text-sm rounded-full bg-[color:var(--primary)] text-white px-3 h-9 inline-flex items-center hover:brightness-110">➕ {locale==='fr'? 'Créer réservation agence':'Create agency reservation'}</Link>
            <Link href={`/admin/agency-requests${locale==='en'? '?lang=en':''}`} className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">🤝 {locale==='fr'? 'Demandes agence':'Agency requests'}</Link>
            <Link href="/admin" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
          </div>
        </div>

        {/* Bloc gestion bateaux d'occasion */}
        <div className="mt-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <span>🛥️</span>
                  Bateaux d'occasion
                </h2>
                <p className="text-xs text-black/60 mt-1">
                  {`${usedBoatCount} bateau${usedBoatCount>1?'x':''} enregistré${usedBoatCount>1?'s':''}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/admin/used-boats" className="h-9 px-4 rounded-full text-[13px] font-medium border border-black/15 hover:bg-black/5 inline-flex items-center gap-2">
                  <span>📂</span>Gérer
                </Link>
                <Link href="/admin/used-boats/new" className="h-9 px-4 rounded-full text-[13px] font-medium bg-[color:var(--primary)] text-white shadow hover:brightness-110 inline-flex items-center gap-2">
                  <span>➕</span>Ajouter
                </Link>
              </div>
            </div>
          </div>
        </div>

        <ReservationsTableClient
          reservations={reservations}
          locale={locale}
          dateFmt={dateFmt}
          dayCount={dayCount}
          partLabel={partLabel}
          money={money}
          statusLabel={statusLabel}
          badgeClass={badgeClass}
          updateReservationStatus={updateReservationStatus}
          updateFinalFuelAmount={updateFinalFuelAmount}
          deleteReservations={deleteReservations}
        />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
