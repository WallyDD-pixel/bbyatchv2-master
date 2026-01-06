"use client";

import Image from "next/image";
import { useState } from "react";
import DeleteButton from "./DeleteButton";

export default function GalleryImageItem({ 
  img, 
  locale 
}: { 
  img: { id: number; imageUrl: string; titleFr?: string | null; titleEn?: string | null; createdAt: Date | string }; 
  locale: "fr" | "en" 
}) {
  const [imageError, setImageError] = useState(false);
  const hasInvalidUrl = img.imageUrl.includes('/uploads/');

  return (
    <article className="group rounded-xl border border-black/10 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-black/5">
        {img.imageUrl && !imageError ? (
          <>
            {hasInvalidUrl && (
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
              onError={() => {
                setImageError(true);
              }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-black/40 text-xs">
            {locale === "fr" ? (imageError ? "Image introuvable" : "Pas d'URL") : (imageError ? "Image not found" : "No URL")}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm font-medium truncate text-black/90">
          {img.titleFr || img.titleEn || locale === "fr" ? "Sans titre" : "Untitled"}
        </div>
        <div className="text-xs text-black/50 truncate mt-1">
          {new Date(img.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}
        </div>
        <div className="mt-2">
          <DeleteButton imageId={img.id} locale={locale} />
        </div>
      </div>
    </article>
  );
}

