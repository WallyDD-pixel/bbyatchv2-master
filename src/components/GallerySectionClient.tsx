"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { type Locale } from "@/i18n/messages";

type GalleryImage = {
  id: number;
  imageUrl: string;
  titleFr?: string | null;
  titleEn?: string | null;
};

export default function GallerySectionClient({ 
  items, 
  locale,
  t
}: { 
  items: GalleryImage[]; 
  locale: Locale;
  t?: Record<string, string>;
}) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // Fermer la modal avec la touche Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedImage(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Empêcher le scroll du body quand la modal est ouverte
  useEffect(() => {
    if (selectedImage !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedImage]);

  const currentImage = selectedImage !== null ? items[selectedImage] : null;
  const currentIndex = selectedImage ?? 0;

  const goToNext = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % items.length);
    }
  };

  const goToPrevious = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + items.length) % items.length);
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <>
      <section id="gallery" className="w-full max-w-6xl mx-auto mt-16">
        <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-black/90">
          {t?.gallery_title ?? (locale === "fr" ? "Galerie" : "Gallery")}
        </h2>
        <p className="mt-2 text-center text-black/60">
          {t?.gallery_subtitle ?? (locale === "fr" ? "Moments à bord et en mer" : "Moments onboard and at sea")}
        </p>
        <div className="mt-8 grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((it, index) => (
            <figure 
              key={it.id} 
              className="relative aspect-square overflow-hidden rounded-2xl bg-black/5 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedImage(index)}
            >
              <Image 
                src={it.imageUrl} 
                alt={it.titleFr || it.titleEn || "Gallery"} 
                fill 
                className="object-cover" 
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              {(it.titleFr || it.titleEn) && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs p-2">
                  {locale === "fr" ? it.titleFr : it.titleEn}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </section>

      {/* Modal Lightbox */}
      {selectedImage !== null && currentImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          {/* Bouton fermer */}
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-white/80 transition-colors z-10"
            aria-label={locale === "fr" ? "Fermer" : "Close"}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Navigation précédent */}
          {items.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-white/80 transition-colors z-10 bg-black/50 hover:bg-black/70 rounded-full p-3"
              aria-label={locale === "fr" ? "Image précédente" : "Previous image"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Navigation suivant */}
          {items.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white/80 transition-colors z-10 bg-black/50 hover:bg-black/70 rounded-full p-3"
              aria-label={locale === "fr" ? "Image suivante" : "Next image"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div 
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full">
              <Image
                src={currentImage.imageUrl}
                alt={currentImage.titleFr || currentImage.titleEn || "Gallery"}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized
                priority
              />
            </div>
          </div>

          {/* Titre et compteur */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center z-10">
            {(currentImage.titleFr || currentImage.titleEn) && (
              <p className="text-white text-lg font-medium mb-2">
                {locale === "fr" ? currentImage.titleFr : currentImage.titleEn}
              </p>
            )}
            {items.length > 1 && (
              <p className="text-white/70 text-sm">
                {currentIndex + 1} / {items.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
