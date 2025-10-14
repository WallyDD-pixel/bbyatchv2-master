import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

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
    reservations = await prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user:{ select:{ email:true, firstName:true, lastName:true } }, boat:{ select:{ name:true, slug:true } } }
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
            <Link href="/admin/agency/requests" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">🤝 {locale==='fr'? 'Demandes agence':'Agency'}</Link>
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

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm align-middle">
            <thead>
              <tr className="text-left text-black/70 bg-black/[0.035]">
                <th className="py-2.5 px-3">Ref</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Boat</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Début':'Start'}</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Fin':'End'}</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Jours':'Days'}</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Partie':'Part'}</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Total':'Total'}</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Acompte':'Deposit'}</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Reste':'Remaining'}</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Statut':'Status'}</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Fact. acompte':'Dep. Inv.'}</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Fact. finale':'Final Inv.'}</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Changer':'Change'}</th>
              </tr>
            </thead>
            <tbody>
            {reservations.length===0 && (
              <tr><td colSpan={15} className="py-8 text-center text-black/60">{locale==='fr'? 'Aucune réservation.':'No reservations.'}</td></tr>
            )}
            {reservations.map(r=>{
              const userName = [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || r.user?.email || r.userId;
              return (
                <tr key={r.id} className="border-t border-black/10 hover:bg-black/[0.03]">
                  <td className="py-2.5 px-3 text-[10px] text-black/60 max-w-[90px] truncate" title={r.id}>{r.reference || r.id.slice(-6)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{userName}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-black/60">{r.user?.email}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {r.boat ? <Link href={`/boats/${r.boat.slug}`} className="text-[color:var(--primary)] hover:underline">{r.boat.name}</Link> : '—'}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{dateFmt(new Date(r.startDate))}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{dateFmt(new Date(r.endDate))}</td>
                  <td className="py-2.5 px-3 text-center">{dayCount(r)}</td>
                  <td className="py-2.5 px-3">{partLabel(r.part)}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{money(r.totalPrice)}</td>
                  <td className="py-2.5 px-3 text-right">{money(r.depositAmount)}</td>
                  <td className="py-2.5 px-3 text-right">{money(r.remainingAmount)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 h-6 text-[10px] font-semibold ${badgeClass(r.status)}`}>{statusLabel(r.status)}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <a href={`/api/invoices/${r.id}`} target="_blank" className="inline-flex items-center rounded-full border border-black/15 px-2.5 h-7 text-[10px] hover:bg-black/5">PDF</a>
                  </td>
                  <td className="py-2.5 px-3">
                    <a href={`/api/invoices/final/${r.id}`} target="_blank" className={`inline-flex items-center rounded-full border border-black/15 px-2.5 h-7 text-[10px] hover:bg-black/5 ${r.status!=='completed'?'pointer-events-none opacity-40':''}`}>PDF</a>
                  </td>
                  <td className="py-2.5 px-3 min-w-[160px]">
                    <form action={updateReservationStatus} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="status" defaultValue={r.status} className="border border-black/20 rounded-md h-7 px-2 text-[11px] bg-white">
                        <option value="pending_deposit">{locale==='fr'? 'Acompte attente':'Pending deposit'}</option>
                        <option value="deposit_paid">{locale==='fr'? 'Acompte payé':'Deposit paid'}</option>
                        <option value="completed">{locale==='fr'? 'Terminée':'Completed'}</option>
                        <option value="cancelled">{locale==='fr'? 'Annulée':'Cancelled'}</option>
                      </select>
                      <button type="submit" className="h-7 px-3 rounded-md bg-[color:var(--primary)] text-white text-[11px] hover:opacity-90">OK</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
