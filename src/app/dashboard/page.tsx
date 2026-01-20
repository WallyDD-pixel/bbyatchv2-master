import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import Link from "next/link";
import SignOutButton from "@/app/dashboard/SignOutButton";
import ProfileCardClient from "@/app/dashboard/ProfileCardClient";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");

  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  // Fallback DB si le rôle n'est pas encore présent dans la session
  let role: string | undefined = (session.user as any)?.role;
  if (!role && session.user?.email) {
    try {
      const u = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } });
      role = u?.role || "user";
    } catch {}
  }
  if ((role || "user") === "admin") {
    redirect("/admin");
  }
  if ((role || 'user') === 'agency') {
    redirect('/agency');
  }
  const roleLabel = locale === "fr" ? ((role || "user") === "admin" ? "administrateur" : "utilisateur") : ((role || "user") === "admin" ? "admin" : "user");

  // Récupération des réservations utilisateur
  let reservations: any[] = [];
  if (session.user?.email) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (dbUser?.id) {
        reservations = await prisma.reservation.findMany({
          where: { userId: dbUser.id },
            include: { boat: { select: { name: true, slug: true } } },
            orderBy: { createdAt: 'desc' }
        });
      }
    } catch {}
  }

  const fmt = (v: number | null | undefined) => v == null ? '—' : v.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US') + ' €';
  const dateFmt = (d: Date) => d.toISOString().slice(0,10);
  const statusLabel = (s: string) => {
    switch(s){
      case 'pending_deposit': return locale==='fr'? 'Acompte en attente':'Deposit pending';
      case 'deposit_paid': return locale==='fr'? 'Acompte payé':'Deposit paid';
      case 'cancelled': return locale==='fr'? 'Annulée':'Cancelled';
      case 'completed': return locale==='fr'? 'Terminée':'Completed';
      default: return s;
    }
  };
  const statusClass = (s: string) => {
    switch(s){
      case 'deposit_paid': return 'bg-emerald-100 text-emerald-700';
      case 'pending_deposit': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-black/10 text-black/60';
    }
  };
  // Nouveau: calcul jours et libellé partie
  const dayCount = (r:any) => {
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    const diff = Math.round((end.getTime()-start.getTime())/86400000)+1;
    return diff; // pour AM/PM diff sera 1
  };
  const partLabel = (p:string|undefined|null) => {
    if(!p) return '—';
    if(p==='FULL') return locale==='fr'? 'Journée entière':'Full day';
    if(p==='AM') return locale==='fr'? 'Matin':'Morning';
    if(p==='PM') return locale==='fr'? 'Après-midi':'Afternoon';
    return p;
  };
  const getExp = (r:any) => {
    if(!r.metadata) return null; try { const m = JSON.parse(r.metadata); return m; } catch { return null; }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 text-left w-full">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">{locale === "fr" ? "Tableau de bord" : "Dashboard"}</h1>
            <p className="mt-1 text-black/70">{locale === "fr" ? "Bienvenue," : "Welcome,"} {session.user?.name ?? session.user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] px-3 h-8 text-xs font-semibold border border-[color:var(--primary)]/20 capitalize">{roleLabel}</span>
            <SignOutButton />
          </div>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition md:col-span-2 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{locale === "fr" ? "Mes réservations" : "My bookings"}</h2>
              <span className="text-xs text-black/50">{locale === "fr" ? (reservations.length? `${reservations.length} entrées` : 'Historique') : (reservations.length? `${reservations.length} items` : 'History')}</span>
            </div>
            {/* Table desktop / tablette */}
            <div className="mt-4 overflow-x-auto hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-black/70 bg-black/[0.035]">
                    <th className="py-2.5 pl-3 pr-4 rounded-l-md">{locale === "fr" ? "Bateau" : "Boat"}</th>
                    <th className="py-2.5 px-4">{locale === "fr" ? "Début" : "Start"}</th>
                    <th className="py-2.5 px-4">{locale === "fr" ? "Fin" : "End"}</th>
                    <th className="py-2.5 px-4 hidden md:table-cell">{locale === "fr" ? "Jours" : "Days"}</th>
                    <th className="py-2.5 px-4 hidden lg:table-cell">{locale === "fr" ? "Partie" : "Part"}</th>
                    <th className="py-2.5 px-4">{locale === "fr" ? "Statut" : "Status"}</th>
                    <th className="py-2.5 px-4 hidden md:table-cell">{locale === "fr" ? "Facture acompte" : "Deposit"}</th>
                    <th className="py-2.5 px-4 hidden lg:table-cell">{locale === "fr" ? "Facture complète" : "Final"}</th>
                    <th className="py-2.5 pl-4 pr-3 text-right rounded-r-md">{locale === "fr" ? "Total" : "Total"}</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.length === 0 && (
                    <tr className="border-t border-black/10">
                      <td colSpan={9} className="py-8 px-4 text-center text-black/60">
                        <div className="flex flex-col items-center gap-2">
                          <div className="size-9 rounded-full bg-black/[0.06] flex items-center justify-center">⛵</div>
                          <div className="text-sm">{locale === "fr" ? "Aucune réservation pour le moment." : "No bookings yet."}</div>
                          <Link href="#fleet" className="mt-1 inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 transition-colors">
                            {locale === "fr" ? "Voir les bateaux disponibles" : "Browse available boats"}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                  {reservations.map(r => (
                    <tr key={r.id} className="border-t border-black/5 hover:bg-black/[0.025] transition">
                      <td className="py-2.5 pl-3 pr-4 whitespace-nowrap align-top">
                        <Link href={`/boats/${r.boat?.slug || ''}`} className="text-[color:var(--primary)] hover:underline font-medium">
                          {r.boat?.name || '—'}
                        </Link>
                        {(() => { const m=getExp(r); if(!m) return null; const title = locale==='fr'? (m.experienceTitleFr||m.expSlug) : (m.experienceTitleEn||m.experienceTitleFr||m.expSlug); if(!title) return null; return <div className="mt-0.5 text-[10px] inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] font-medium tracking-wide">{locale==='fr'? 'Expérience':'Experience'}: {title}</div>; })()}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">{dateFmt(new Date(r.startDate))}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">{dateFmt(new Date(r.endDate))}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-center hidden md:table-cell">{dayCount(r)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap hidden lg:table-cell">{partLabel(r.part)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 h-6 text-xs font-semibold ${statusClass(r.status)}`}>{statusLabel(r.status)}</span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap hidden md:table-cell">
                        <a href={`/api/invoices/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center rounded-full border border-black/15 px-3 h-7 hover:bg-black/5">
                          {locale==='fr'? 'Voir':'View'}
                        </a>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap hidden lg:table-cell">
                        <a href={`/api/invoices/final/${r.id}`} target="_blank" rel="noopener noreferrer" className={`text-xs inline-flex items-center rounded-full border border-black/15 px-3 h-7 hover:bg-black/5 ${r.status!=='completed' ? 'pointer-events-none opacity-40' : ''}`} aria-disabled={r.status!=='completed'}>
                          {locale==='fr'? 'Voir':'View'}
                        </a>
                      </td>
                      <td className="py-2.5 pl-4 pr-3 text-right whitespace-nowrap font-medium">{fmt(r.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Vue cartes mobile */}
            <div className="sm:hidden mt-4 space-y-3">
              {reservations.length === 0 && (
                <div className="rounded-xl border border-black/10 p-5 text-center text-black/60">
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-9 rounded-full bg-black/[0.06] flex items-center justify-center">⛵</div>
                    <div className="text-sm">{locale === "fr" ? "Aucune réservation pour le moment." : "No bookings yet."}</div>
                    <Link href="#fleet" className="mt-1 inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 transition-colors">
                      {locale === "fr" ? "Voir les bateaux disponibles" : "Browse available boats"}
                    </Link>
                  </div>
                </div>
              )}
              {reservations.map(r => (
                <div key={r.id} className="rounded-xl border border-black/10 bg-white/70 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <Link href={`/boats/${r.boat?.slug || ''}`} className="font-semibold text-[color:var(--primary)] hover:underline">{r.boat?.name || '—'}</Link>
                      {(() => { const m=getExp(r); if(!m) return null; const title = locale==='fr'? (m.experienceTitleFr||m.expSlug) : (m.experienceTitleEn||m.experienceTitleFr||m.expSlug); if(!title) return null; return <div className="mt-0.5 text-[10px] inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] font-medium">{locale==='fr'? 'Expérience':'Experience'}: {title}</div>; })()}
                      <div className="mt-1 text-xs text-black/60">{dateFmt(new Date(r.startDate))} → {dateFmt(new Date(r.endDate))}</div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 h-6 text-[11px] font-semibold ${statusClass(r.status)}`}>{statusLabel(r.status)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="font-medium text-black/70">{locale==='fr'? 'Jours':'Days'}</div>
                      <div className="text-sm font-semibold">{dayCount(r)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-black/70">{locale==='fr'? 'Partie':'Part'}</div>
                      <div className="text-sm font-semibold">{partLabel(r.part)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-black/70">{locale==='fr'? 'Acompte':'Deposit'}</div>
                      <a href={`/api/invoices/${r.id}`} target="_blank" className="inline-block rounded-full border border-black/15 px-3 h-7 leading-7 text-[11px] font-medium hover:bg-black/5">PDF</a>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-black/70">{locale==='fr'? 'Finale':'Final'}</div>
                      <a href={`/api/invoices/final/${r.id}`} target="_blank" className={`inline-block rounded-full border border-black/15 px-3 h-7 leading-7 text-[11px] font-medium hover:bg-black/5 ${r.status!=='completed' ? 'pointer-events-none opacity-40' : ''}`}>PDF</a>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm font-semibold">
                    <span className="text-black/60">Total</span>
                    <span>{fmt(r.totalPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ProfileCardClient name={session.user?.name ?? ""} email={session.user?.email ?? ""} locale={locale} />
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <h2 className="text-lg font-semibold">{locale === "fr" ? "Actions rapides" : "Quick actions"}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={locale === "fr" ? "/?lang=fr#fleet" : "/?lang=en#fleet"} className="inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-9 px-4 transition-colors">{locale === "fr" ? "Réserver un bateau" : "Book a boat"}</a>
              <a href="#edit-profile" className="inline-flex items-center rounded-full border border-black/15 bg-white text-sm h-9 px-4 hover:bg-black/5">{locale === "fr" ? "Mettre à jour mon profil" : "Update profile"}</a>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} t={t} />
    </div>
  );
}
