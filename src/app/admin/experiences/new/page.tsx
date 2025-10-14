import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";

export default async function AdminExperiencesNewPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {} as { lang?: string };
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Nouvelle expérience" : "New experience"}</h1>
          <a href="/admin/experiences" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</a>
        </div>
        <form className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm grid gap-4" action="/api/admin/experiences" method="post" encType='multipart/form-data'>
          <label className="grid gap-1 text-sm">
            <span>Slug</span>
            <input name="slug" required className="h-11 rounded-lg border border-black/15 px-3" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm">
              <span>Titre (FR)</span>
              <input name="titleFr" required className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Title (EN)</span>
              <input name="titleEn" required className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm">
              <span>Description (FR)</span>
              <textarea name="descFr" rows={3} className="rounded-lg border border-black/15 px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Description (EN)</span>
              <textarea name="descEn" rows={3} className="rounded-lg border border-black/15 px-3 py-2" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm">
              <span>Heure (FR)</span>
              <input name="timeFr" className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Time (EN)</span>
              <input name="timeEn" className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span>Image URL</span>
            <input name="imageUrl" className="h-11 rounded-lg border border-black/15 px-3" />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Fichier image</span>
            <input type='file' name='imageFile' accept='image/*' className='h-11 rounded-lg border border-black/15 px-3 bg-white' />
          </label>
          <div className="flex justify-end gap-2">
            <a href="/admin/experiences" className="rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5">{locale === "fr" ? "Annuler" : "Cancel"}</a>
            <button className="rounded-full h-10 px-4 bg-[color:var(--primary)] text-white hover:opacity-90">{locale === "fr" ? "Créer" : "Create"}</button>
          </div>
        </form>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
