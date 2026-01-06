import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import SignOutButton from "@/app/dashboard/SignOutButton";
import Link from 'next/link';

export default async function AdminPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");

  // Fallback DB si la session n'expose pas encore le rôle
  let role: string | undefined = (session.user as any)?.role;
  if (!role && session.user?.email) {
    try {
      const u = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } });
      role = u?.role || "user";
    } catch {}
  }
  if ((role || "user") !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  let stats = { users: 0, boats: 0, usedBoats: 0, experiences: 0, reservations: 0, gallery: 0, infoCards: 0, availability: 0 };
  try {
    const [users, boats, usedBoats, experiences, reservations, gallery, infoCards, availability] = await Promise.all([
      (prisma as any).user.count(),
      (prisma as any).boat.count(),
      (prisma as any).usedBoat.count(),
      (prisma as any).experience.count(),
      (prisma as any).reservation.count(),
      (prisma as any).galleryImage.count(),
      (prisma as any).infoCard.count(),
      (prisma as any).availabilitySlot.count(),
    ]);
    stats = { users, boats, usedBoats, experiences, reservations, gallery, infoCards, availability };
  } catch (e) {
    // fallback silencieux si Prisma n'est pas prêt
  }
  const stripeSettings = await prisma.settings.findFirst({ select: { stripeMode: true, stripeTestPk: true, stripeLivePk: true } }).catch(()=>null);
  const stripeMode = stripeSettings?.stripeMode || 'test';
  const hasPk = stripeMode==='live' ? !!stripeSettings?.stripeLivePk : !!stripeSettings?.stripeTestPk;
  const stripeModeLabel = stripeMode==='live' ? (locale==='fr'? 'Production' : 'Live') : (locale==='fr'? 'Test' : 'Test');
  const stripeStatusLabel = hasPk ? (locale==='fr'? 'Clé OK' : 'Key OK') : (locale==='fr'? 'Clé manquante' : 'Missing key');

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{locale === "fr" ? "Tableau de bord Admin" : "Admin dashboard"}</h1>
            <p className="mt-1 text-black/70">{locale === "fr" ? "Bienvenue," : "Welcome,"} {session.user?.name ?? session.user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] px-3 h-8 text-xs font-semibold border border-[color:var(--primary)]/20">Admin</span>
            <SignOutButton />
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Carte gestion des villes */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-black/60">{locale === "fr" ? "Villes" : "Cities"}</div>
            <div className="mt-1 text-3xl font-extrabold">{stats.boats > 0 ? stats.boats : ''}</div>
            <Link href="/admin/cities" className="mt-3 inline-flex items-center rounded-full border border-black/15 bg-white text-sm h-9 px-4 hover:bg-black/5">{locale === "fr" ? "Gérer les villes" : "Manage cities"}</Link>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-black/60">{locale === "fr" ? "Utilisateurs" : "Users"}</div>
            <div className="mt-1 text-3xl font-extrabold">{stats.users}</div>
            <Link href="/admin/users" className="mt-3 inline-flex items-center rounded-full border border-black/15 bg-white text-sm h-9 px-4 hover:bg-black/5">{locale === "fr" ? "Gérer" : "Manage"}</Link>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-black/60">{locale === "fr" ? "Bateaux" : "Boats"}</div>
            <div className="mt-1 text-3xl font-extrabold">{stats.boats}</div>
            <div className="mt-3 flex gap-2">
              <Link href="/admin/boats" className="inline-flex items-center rounded-full border border-black/15 bg-white text-sm h-9 px-4 hover:bg-black/5">{locale === "fr" ? "Gérer" : "Manage"}</Link>
              <Link href="/admin/boats/new" className="inline-flex items-center rounded-full bg-[color:var(--primary)] text-white text-sm h-9 px-4 hover:opacity-90">{locale === "fr" ? "Créer" : "Create"}</Link>
            </div>
          </div>
          {/* Carte bateaux d'occasion */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-black/60">{locale === "fr" ? "Occasion" : "Pre‑owned"}</div>
            <div className="mt-1 text-3xl font-extrabold">{stats.usedBoats}</div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Link href="/admin/used-boats" className="inline-flex items-center rounded-full border border-black/15 bg-white text-sm h-9 px-4 hover:bg-black/5">{locale === "fr" ? "Gérer" : "Manage"}</Link>
              <Link href="/admin/used-boats/new" className="inline-flex items-center rounded-full bg-[color:var(--primary)] text-white text-sm h-9 px-4 hover:opacity-90">{locale === "fr" ? "Créer" : "Create"}</Link>
              <Link href="/admin/used-sale-settings" className="inline-flex items-center rounded-full border border-blue-300 bg-blue-50 text-blue-700 text-sm h-9 px-4 hover:bg-blue-100">{locale === "fr" ? "Paramètres LP" : "LP Settings"}</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-black/60">{locale === "fr" ? "Expériences" : "Experiences"}</div>
            <div className="mt-1 text-3xl font-extrabold">{stats.experiences}</div>
            <div className="mt-3 flex gap-2">
              <Link href="/admin/experiences" className="inline-flex items-center rounded-full border border-black/15 bg-white text-sm h-9 px-4 hover:bg-black/5">{locale === "fr" ? "Gérer" : "Manage"}</Link>
              <Link href="/admin/experiences/new" className="inline-flex items-center rounded-full bg-[color:var(--primary)] text-white text-sm h-9 px-4 hover:opacity-90">{locale === "fr" ? "Créer" : "Create"}</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-black/60">{locale === "fr" ? "Réservations" : "Reservations"}</div>
            <div className="mt-1 text-3xl font-extrabold">{stats.reservations}</div>
            <Link href="/admin/reservations" className="mt-3 inline-flex items-center rounded-full border border-black/15 bg-white text-sm h-9 px-4 hover:bg-black/5">{locale === "fr" ? "Gérer" : "Manage"}</Link>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-black/60 flex items-center justify-between">
              <span>Stripe</span>
              <span className={`inline-flex items-center rounded-full px-2 h-5 text-[10px] font-semibold border ${stripeMode==='live' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{stripeModeLabel}</span>
            </div>
            <div className="mt-3 text-lg font-bold flex items-center gap-2">
              <span>{stripeStatusLabel}</span>
              {hasPk ? <span className="text-emerald-500 text-base">●</span> : <span className="text-red-500 text-base">●</span>}
            </div>
            <p className="mt-2 text-[11px] text-black/50 leading-relaxed">
              {locale==='fr' ? 'Gérez les clés test & live et le mode actif.' : 'Manage test & live keys and active mode.'}
            </p>
            <Link href="/admin/stripe" className="mt-4 inline-flex items-center rounded-full border border-black/15 bg-white text-xs h-8 px-4 hover:bg-black/5 font-medium">
              {locale==='fr' ? 'Configurer' : 'Configure'}
            </Link>
          </div>
          <Link href="/admin/messages" className="group rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2"><span>✉️</span>{locale==='fr'? 'Messages':'Messages'}</h2>
              </div>
              <p className="text-xs text-black/60 mt-2">{locale==='fr'? 'Demandes de contact reçues.':'Received contact enquiries.'}</p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--primary)] group-hover:underline">{locale==='fr'? 'Ouvrir':'Open'} →</span>
          </Link>
          <Link href="/admin/agency-requests" className="group rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2"><span>🏢</span>{locale==='fr'? 'Demandes agence':'Agency requests'}</h2>
              </div>
              <p className="text-xs text-black/60 mt-2">{locale==='fr'? 'Demandes soumises par des agences.':'Requests submitted by agencies.'}</p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--primary)] group-hover:underline">{locale==='fr'? 'Voir':'View'} →</span>
          </Link>
          {/* Card unique pour la page d'accueil complète */}
          <div className="rounded-2xl border border-blue-400/30 bg-blue-50 p-6 shadow-sm flex flex-col gap-3 hover:bg-blue-100 transition">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🏠</span>
              <span className="font-bold text-blue-700 text-lg">Page d'accueil complète</span>
            </div>
            <div className="text-sm text-blue-700/80 mb-2">Gérez tous les contenus affichés sur la page d'accueil : sliders, cartes d'info, galerie, expériences…</div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Link href="/admin/homepage-settings" className="inline-block bg-blue-600 text-white text-xs px-3 py-1 rounded-full">Paramètres accueil</Link>
              <Link href="/admin/navbar" className="inline-block bg-slate-600 text-white text-xs px-3 py-1 rounded-full">🧭 Navigation</Link>
              <Link href="/admin/seo-tracking" className="inline-block bg-purple-600 text-white text-xs px-3 py-1 rounded-full">📊 SEO & Tracking</Link>
              <Link href="/admin/info-cards" className="inline-block bg-cyan-600 text-white text-xs px-3 py-1 rounded-full">Cartes d'info</Link>
              <Link href="/admin/gallery" className="inline-block bg-indigo-600 text-white text-xs px-3 py-1 rounded-full">Galerie</Link>
              <Link href="/admin/experiences" className="inline-block bg-emerald-600 text-white text-xs px-3 py-1 rounded-full">Expériences</Link>
              <Link href="/admin/legal-pages" className="inline-block bg-amber-600 text-white text-xs px-3 py-1 rounded-full">Pages légales</Link>
              <Link href="/admin/social-media" className="inline-block bg-pink-600 text-white text-xs px-3 py-1 rounded-full">📱 Réseaux sociaux</Link>
            </div>
          </div>
          {/* Card Landing Pages */}
          <div className="rounded-2xl border border-purple-400/30 bg-purple-50 p-6 shadow-sm flex flex-col gap-3 hover:bg-purple-100 transition">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📄</span>
              <span className="font-bold text-purple-700 text-lg">{locale === "fr" ? "Landing Pages" : "Landing Pages"}</span>
            </div>
            <div className="text-sm text-purple-700/80 mb-2">{locale === "fr" ? "Gérez le contenu des pages dédiées" : "Manage dedicated pages content"}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Link href="/admin/used-sale-settings" className="inline-block bg-purple-600 text-white text-xs px-3 py-1 rounded-full">{locale === "fr" ? "LP Bateaux d'occasion" : "Used Boats LP"}</Link>
            </div>
          </div>
          {/* Card page À propos */}
          <Link href="/admin/about-settings" className="group rounded-2xl border border-purple-400/30 bg-purple-50 p-6 shadow-sm flex flex-col gap-3 hover:bg-purple-100 transition">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">ℹ️</span>
              <span className="font-bold text-purple-700 text-lg">{locale === 'fr' ? 'Page À propos' : 'About Page'}</span>
            </div>
            <div className="text-sm text-purple-700/80 mb-2">{locale === 'fr' ? 'Gérez le contenu de la page À propos : histoire, mission, valeurs, équipe, galerie…' : 'Manage the About page content: history, mission, values, team, gallery…'}</div>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 group-hover:underline">{locale === 'fr' ? 'Modifier' : 'Edit'} →</span>
          </Link>
          {/* Card Paramètres généraux */}
          <Link href="/admin/general-settings" className="group rounded-2xl border border-gray-400/30 bg-gray-50 p-6 shadow-sm flex flex-col gap-3 hover:bg-gray-100 transition">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚙️</span>
              <span className="font-bold text-gray-700 text-lg">{locale === 'fr' ? 'Paramètres généraux' : 'General Settings'}</span>
            </div>
            <div className="text-sm text-gray-700/80 mb-2">{locale === 'fr' ? 'Gérez le logo du site et le prix par défaut du skipper' : 'Manage site logo and default skipper price'}</div>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 group-hover:underline">{locale === 'fr' ? 'Modifier' : 'Edit'} →</span>
          </Link>
        </section>

        <section className="mt-10 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{locale === "fr" ? "Actions rapides" : "Quick actions"}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/" className="inline-flex items-center rounded-full border border-black/15 bg-white text-sm h-9 px-4 hover:bg-black/5">{locale === "fr" ? "Voir le site" : "View site"}</Link>
            <Link href="/admin/boats/new" className="inline-flex items-center rounded-full bg-[color:var(--primary)] text-white text-sm h-9 px-4 hover:opacity-90">{locale === "fr" ? "Nouveau bateau" : "New boat"}</Link>
            <Link href="/admin/used-boats/new" className="inline-flex items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] border border-[color:var(--primary)]/20 text-sm h-9 px-4 hover:bg-[color:var(--primary)]/15">{locale === "fr" ? "Occasion" : "Pre‑owned"}</Link>
            <Link href="/admin/experiences/new" className="inline-flex items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] border border-[color:var(--primary)]/20 text-sm h-9 px-4 hover:bg-[color:var(--primary)]/15">{locale === "fr" ? "Nouvelle expérience" : "New experience"}</Link>
            <Link href="/admin/calendar" className="inline-flex items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] border border-[color:var(--primary)]/20 text-sm h-9 px-4 hover:bg-[color:var(--primary)]/15">{locale === "fr" ? "Calendrier" : "Calendar"}</Link>
            <Link href="/admin/stripe" className="inline-flex items-center rounded-full bg-black/5 text-black/70 border border-black/10 text-sm h-9 px-4 hover:bg-black/10">{locale === "fr" ? "Stripe" : "Stripe"}</Link>
          </div>
        </section>
      </main>

      <Footer locale={locale} t={t} />
    </div>
  );
}
