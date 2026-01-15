import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n/messages";
import GallerySectionClient from "./GallerySectionClient";

// Type local léger pour éviter les any en attendant le rafraîchissement des types Prisma
type GalleryImage = {
  id: number;
  imageUrl: string;
  videoUrl?: string | null;
  titleFr?: string | null;
  titleEn?: string | null;
  contentFr?: string | null;
  contentEn?: string | null;
  sort?: number | null;
};

export default async function GallerySection({ locale, t }: { locale: Locale; t: Record<string, string> }) {
  let items: GalleryImage[] = [];
  try {
    // Essai via ORM (cast temporaire)
    items = await (prisma as any).galleryImage.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "desc" }] });
  } catch {
    try {
      // Fallback SQL si le modèle n'est pas disponible
      items = await prisma.$queryRaw<GalleryImage[]>`
        SELECT id, imageUrl, videoUrl, titleFr, titleEn, contentFr, contentEn, sort
        FROM GalleryImage
        ORDER BY COALESCE(sort, 0) ASC, createdAt DESC
      `;
    } catch {
      return null;
    }
  }

  if (!items || items.length === 0) {
    return null;
  }

  return <GallerySectionClient items={items} locale={locale} t={t} />;
}
