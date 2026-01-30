import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import ReservationsTableClient from './ReservationsTableClient';
import AdminInstructions from "@/components/AdminInstructions";

// Action serveur pour changer le statut
async function updateReservationStatus(formData: FormData){
  'use server';
  const session = await getServerSession() as any;
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
  const session = await getServerSession() as any;
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
  const session = await getServerSession() as any;
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

export default async function AdminReservationsPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const session = (await getServerSession()) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  // Next.js 15: searchParams is a Promise
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale: Locale = (resolvedSearchParams.lang === "en") ? "en" : "fr";
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
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 w-full">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">{locale === "fr" ? "Réservations" : "Reservations"}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/admin/reservations/new${locale==='en'? '?lang=en':''}`} className="text-xs sm:text-sm rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center transition-colors whitespace-nowrap font-medium">➕ {locale==='fr'? 'Créer réservation agence':'Create agency reservation'}</Link>
              <Link href={`/admin/agency-requests${locale==='en'? '?lang=en':''}`} className="text-xs sm:text-sm rounded-full border border-black/15 px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center hover:bg-black/5 transition-colors whitespace-nowrap">🤝 {locale==='fr'? 'Demandes agence':'Agency requests'}</Link>
              <Link href="/admin" className="text-xs sm:text-sm rounded-full border border-black/15 px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center hover:bg-black/5 transition-colors whitespace-nowrap">← {locale === "fr" ? "Retour" : "Back"}</Link>
            </div>
          </div>
          <AdminInstructions
            locale={locale}
            title={locale==='fr'?'Comment gérer les réservations':'How to manage reservations'}
            instructions={[
              {
                title: locale==='fr'?'Voir les réservations':'View reservations',
                description: locale==='fr'?'Le tableau affiche toutes les réservations avec les informations principales (bateau, client, dates, prix, statut).':'The table displays all reservations with main information (boat, client, dates, price, status).'
              },
              {
                title: locale==='fr'?'Filtrer et rechercher':'Filter and search',
                description: locale==='fr'?'Utilisez les filtres pour rechercher par date, bateau, client ou statut.':'Use filters to search by date, boat, client or status.'
              },
              {
                title: locale==='fr'?'Modifier le statut':'Modify status',
                description: locale==='fr'?'Cliquez sur le statut d\'une réservation pour le modifier (en attente, confirmée, payée, terminée, annulée).':'Click on a reservation status to modify it (pending, confirmed, paid, completed, cancelled).'
              },
              {
                title: locale==='fr'?'Gérer le carburant final':'Manage final fuel',
                description: locale==='fr'?'Pour les réservations terminées, vous pouvez ajouter le montant du carburant final qui sera ajouté au prix total.':'For completed reservations, you can add the final fuel amount which will be added to the total price.'
              },
              {
                title: locale==='fr'?'Créer une réservation agence':'Create agency reservation',
                description: locale==='fr'?'Utilisez le bouton "Créer réservation agence" pour créer manuellement une réservation pour une agence partenaire.':'Use the "Create agency reservation" button to manually create a reservation for a partner agency.'
              },
              {
                title: locale==='fr'?'Supprimer des réservations':'Delete reservations',
                description: locale==='fr'?'Sélectionnez plusieurs réservations et utilisez le bouton de suppression en masse. Attention : cette action est irréversible.':'Select multiple reservations and use the bulk delete button. Warning: this action is irreversible.'
              }
            ]}
          />
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
                <Link href="/admin/used-boats/new" className="h-9 px-4 rounded-full text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white shadow transition-colors inline-flex items-center gap-2">
                  <span>➕</span>Ajouter
                </Link>
              </div>
            </div>
          </div>
        </div>

        <ReservationsTableClient
          reservations={reservations}
          locale={locale}
          updateReservationStatus={updateReservationStatus}
          updateFinalFuelAmount={updateFinalFuelAmount}
          deleteReservations={deleteReservations}
        />
      </main>
    </div>
  );
}
