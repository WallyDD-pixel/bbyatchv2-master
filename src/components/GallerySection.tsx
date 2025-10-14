import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n/messages";

// Type local léger pour éviter les any en attendant le rafraîchissement des types Prisma
type GalleryImage = {
  id: number;
  imageUrl: string;
  titleFr?: string | null;
  titleEn?: string | null;
};

export default async function GallerySection({ locale, t }: { locale: Locale; t: Record<string, string> }) {
  let items: GalleryImage[] = [];
  try {
    // Essai via ORM (cast temporaire)
    items = await (prisma as any).galleryImage.findMany({ orderBy: { createdAt: "desc" } });
  } catch {
    try {
      // Fallback SQL si le modèle n’est pas disponible
      items = await prisma.$queryRaw<GalleryImage[]>`
        SELECT id, imageUrl, titleFr, titleEn
        FROM GalleryImage
        ORDER BY createdAt DESC
      `;
    } catch {
      return null;
    }
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section id="gallery" className="w-full max-w-6xl mx-auto mt-16">
      <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-black/90">{t.gallery_title ?? (locale === "fr" ? "Galerie" : "Gallery")}</h2>
      <p className="mt-2 text-center text-black/60">{t.gallery_subtitle ?? (locale === "fr" ? "Moments à bord et en mer" : "Moments onboard and at sea")}</p>
      <div className="mt-8 grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => (
          <figure key={it.id} className="relative aspect-square overflow-hidden rounded-2xl bg-black/5">
            <Image src={it.imageUrl} alt={it.titleFr || it.titleEn || "Gallery"} fill className="object-cover" />
            {(it.titleFr || it.titleEn) && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs p-2">
                {locale === "fr" ? it.titleFr : it.titleEn}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
