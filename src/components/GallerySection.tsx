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
    // Utiliser SQL brut directement car la colonne 'sort' peut ne pas exister dans la DB
    items = await prisma.$queryRaw<GalleryImage[]>`
      SELECT 
        id, 
        "imageUrl", 
        COALESCE("videoUrl", NULL) as "videoUrl",
        "titleFr", 
        "titleEn", 
        COALESCE("contentFr", NULL) as "contentFr",
        COALESCE("contentEn", NULL) as "contentEn",
        COALESCE("sort", 0) as "sort"
      FROM "GalleryImage"
      ORDER BY COALESCE("sort", 0) ASC, "createdAt" DESC
    `;
  } catch (sqlError) {
    // Si la table n'existe pas ou erreur, retourner null silencieusement
    console.error("GalleryImage table error:", sqlError);
    return null;
  }

  if (!items || items.length === 0) {
    return null;
  }

  return <GallerySectionClient items={items} locale={locale} t={t} />;
}
