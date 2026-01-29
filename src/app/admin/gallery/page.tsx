import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import Link from "next/link";
import GalleryImageItem from "./GalleryImageItem";
import AdminInstructions from "@/components/AdminInstructions";

export default async function AdminGalleryPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = await getServerSession() as any;
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
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold">{locale === "fr" ? "Galerie" : "Gallery"}</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin/gallery/new" className="text-xs sm:text-sm rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center font-semibold shadow-sm transition-colors whitespace-nowrap" style={{ backgroundColor: '#2563eb' }}>
              {locale === "fr" ? "Ajouter" : "Add"}
            </Link>
          </div>
        </div>
        <AdminInstructions
          locale={locale}
          title={locale==='fr'?'Comment gérer la galerie':'How to manage the gallery'}
          instructions={[
            {
              title: locale==='fr'?'Ajouter une image':'Add an image',
              description: locale==='fr'?'Cliquez sur "Ajouter" pour télécharger une nouvelle image dans la galerie. Les images sont stockées sur Supabase Storage.':'Click on "Add" to upload a new image to the gallery. Images are stored on Supabase Storage.'
            },
            {
              title: locale==='fr'?'Voir les images':'View images',
              description: locale==='fr'?'Toutes les images de la galerie sont affichées dans une grille. Cliquez sur une image pour voir les détails.':'All gallery images are displayed in a grid. Click on an image to see details.'
            },
            {
              title: locale==='fr'?'Supprimer une image':'Delete an image',
              description: locale==='fr'?'Utilisez le bouton de suppression sur chaque image. L\'image sera supprimée de Supabase Storage.':'Use the delete button on each image. The image will be deleted from Supabase Storage.'
            },
            {
              title: locale==='fr'?'Images invalides':'Invalid images',
              description: locale==='fr'?'Si certaines images ont des URLs invalides (pointant vers /uploads/), elles seront filtrées et un avertissement s\'affichera.':'If some images have invalid URLs (pointing to /uploads/), they will be filtered and a warning will be displayed.'
            }
          ]}
        />
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
