import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import Link from "next/link";
import Image from "next/image";
import DeleteButton from "./DeleteButton";

export default async function AdminGalleryPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  let images: any[] = [];
  let totalCount = 0;
  let filteredCount = 0;
  try {
    const allImages = await (prisma as any).galleryImage.findMany({ orderBy: { id: "desc" }, take: 50 });
    totalCount = allImages.length;
    
    // Pour le moment, afficher toutes les images même celles avec /uploads/ pour déboguer
    // TODO: Réactiver le filtre une fois que toutes les images sont migrées vers Supabase
    images = allImages.filter((img: any) => {
      if (!img.imageUrl) {
        filteredCount++;
        return false;
      }
      // Temporairement, on affiche aussi les images avec /uploads/ pour voir ce qui se passe
      // if (img.imageUrl.startsWith('/uploads/') || img.imageUrl.includes('/uploads/')) {
      //   filteredCount++;
      //   return false;
      // }
      return true;
    });
    
    // Compter les images avec URLs invalides pour affichage
    filteredCount = allImages.filter((img: any) => 
      img.imageUrl && (img.imageUrl.startsWith('/uploads/') || img.imageUrl.includes('/uploads/'))
    ).length;
  } catch (e) {
    console.error('Error loading gallery images:', e);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">
        <Link href="/admin" className="mb-6 inline-block text-sm rounded-full border border-blue-400/30 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700">
          ← Retour page d'accueil complète
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Galerie" : "Gallery"}</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin/gallery/new" className="text-sm rounded-full bg-[color:var(--primary)] text-white px-3 h-9 inline-flex items-center hover:opacity-90">
              {locale === "fr" ? "Ajouter" : "Add"}
            </Link>
          </div>
        </div>
        {totalCount > 0 && filteredCount > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
            {locale === "fr" 
              ? `${filteredCount} image(s) filtrée(s) sur ${totalCount} (URLs invalides pointant vers /uploads/)`
              : `${filteredCount} image(s) filtered out of ${totalCount} (invalid URLs pointing to /uploads/)`
            }
          </div>
        )}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.length === 0 ? (
            <div className="col-span-full text-center text-black/60 py-8">
              {totalCount === 0 
                ? (locale === "fr" ? "Aucune image dans la galerie." : "No images in gallery.")
                : (locale === "fr" 
                    ? `Aucune image valide. ${totalCount} image(s) trouvée(s) mais toutes ont des URLs invalides.`
                    : `No valid images. ${totalCount} image(s) found but all have invalid URLs.`
                  )
              }
            </div>
          ) : (
            images.map((img) => (
              <article key={img.id} className="group rounded-xl border border-black/10 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="relative aspect-square bg-black/5">
                  {img.imageUrl ? (
                    <>
                      {img.imageUrl.includes('/uploads/') && (
                        <div className="absolute top-2 left-2 z-10 bg-yellow-500 text-white text-[10px] px-2 py-1 rounded">
                          {locale === "fr" ? "URL invalide" : "Invalid URL"}
                        </div>
                      )}
                      <Image 
                        src={img.imageUrl} 
                        alt={img.titleFr || img.titleEn || "Gallery image"} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform"
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.closest('.relative');
                          if (parent) {
                            parent.innerHTML = '<div class="flex items-center justify-center h-full text-black/40 text-xs">Image introuvable</div>';
                          }
                        }}
                      />
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-black/40 text-xs">
                      {locale === "fr" ? "Pas d'URL" : "No URL"}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium truncate text-black/90">
                    {img.titleFr || img.titleEn || locale === "fr" ? "Sans titre" : "Untitled"}
                  </div>
                  <div className="text-xs text-black/50 truncate mt-1">{new Date(img.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}</div>
                  <div className="mt-2">
                    <DeleteButton imageId={img.id} locale={locale} />
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
