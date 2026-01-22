import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import ImageUploadClient from "../ImageUploadClient";

export default async function AdminInfoCardsNewPage({ searchParams }: { searchParams?: { lang?: string } }) {
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
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Nouvelle carte" : "New card"}</h1>
          <a href="/admin/info-cards" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</a>
        </div>
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <form action="/api/admin/info-cards" method="post" className='grid gap-4' encType='multipart/form-data'>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Titre (FR)':'Title (FR)'} *</span><input required name='titleFr' className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Titre (EN)':'Title (EN)'} *</span><input required name='titleEn' className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Description (FR)':'Description (FR)'}</span><textarea name='descFr' rows={4} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Description (EN)':'Description (EN)'}</span><textarea name='descEn' rows={4} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <ImageUploadClient locale={locale} />
            <label className='grid gap-1 text-sm'><span>Ordre (sort)</span><input type='number' name='sort' defaultValue={0} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <div className='flex justify-end gap-2 pt-4 border-t border-black/10 mt-4'>
              <a href='/admin/info-cards' className='rounded-full h-11 px-6 border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium inline-flex items-center transition-colors duration-200'>{locale==='fr'? 'Annuler':'Cancel'}</a>
              <button type='submit' className='rounded-full h-11 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold inline-flex items-center transition-all duration-200 shadow-sm hover:shadow' style={{ backgroundColor: '#2563eb' }}>{locale==='fr'? 'Créer':'Create'}</button>
            </div>
          </form>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
