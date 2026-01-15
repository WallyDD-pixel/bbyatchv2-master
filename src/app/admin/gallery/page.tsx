import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import Link from "next/link";
import GalleryImageItem from "./GalleryImageItem";

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
      return true;
    });
    
    // Compter les images avec URLs invalides pour affichage
    filteredCount = allImages.filter((img: any) => 
      img.imageUrl && (img.imageUrl.startsWith('/uploads/') || img.imageUrl.includes('/uploads/'))
    ).length;
  } catch (e: any) {
    // En cas d'erreur, retourner un tableau vide plutôt que de faire planter la page
    images = [];
  }

  return (
    <div className="p-6 md:p-8 lg:p-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{locale === "fr" ? "Galerie" : "Gallery"}</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/gallery/new" className="text-sm rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 h-9 inline-flex items-center font-semibold shadow-sm transition-colors" style={{ backgroundColor: '#2563eb' }}>
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
              <GalleryImageItem key={img.id} img={img} locale={locale} />
            ))
          )}
        </div>
    </div>
  );
}
