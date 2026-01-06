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
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

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

  // Filtrer les images invalides et celles qui ont échoué
  const validItems = items.filter((it, index) => {
    if (!it.imageUrl) return false;
    if (it.imageUrl.includes('/uploads/')) return false; // URLs locales invalides
    if (failedImages.has(it.id)) return false; // Images qui ont échoué au chargement
    return true;
  });

  // Réindexer selectedImage pour correspondre aux images valides
  const getValidIndex = (originalIndex: number) => {
    const originalItem = items[originalIndex];
    return validItems.findIndex(item => item.id === originalItem.id);
  };

  const handleImageError = (imageId: number) => {
    setFailedImages(prev => new Set(prev).add(imageId));
  };

  if (!items || items.length === 0) {
    return null;
  }

  if (validItems.length === 0) {
    return (
      <section id="gallery" className="w-full max-w-6xl mx-auto mt-16">
        <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-black/90">
          {t?.gallery_title ?? (locale === "fr" ? "Galerie" : "Gallery")}
        </h2>
        <p className="mt-4 text-center text-black/60">
          {locale === "fr" ? "Aucune image disponible" : "No images available"}
        </p>
      </section>
    );
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
          {validItems.map((it, index) => (
            <figure 
              key={it.id} 
              className="relative aspect-square overflow-hidden rounded-2xl bg-black/5 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                const originalIndex = items.findIndex(item => item.id === it.id);
                setSelectedImage(originalIndex);
              }}
            >
              <Image 
                src={it.imageUrl} 
                alt={it.titleFr || it.titleEn || "Gallery"} 
                fill 
                className="object-cover" 
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                onError={() => handleImageError(it.id)}
                unoptimized
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
      {selectedImage !== null && currentImage && !failedImages.has(currentImage.id) && !currentImage.imageUrl.includes('/uploads/') && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête avec bouton fermer */}
            <div className="flex items-center justify-between p-4 border-b border-black/10">
              <div className="flex-1">
                {(currentImage.titleFr || currentImage.titleEn) && (
                  <h3 className="text-lg font-semibold text-black/90">
                    {locale === "fr" ? currentImage.titleFr : currentImage.titleEn}
                  </h3>
                )}
                {validItems.length > 1 && (
                  <p className="text-sm text-black/60 mt-1">
                    {validItems.findIndex(item => item.id === currentImage.id) + 1} / {validItems.length}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="ml-4 text-black/60 hover:text-black/90 transition-colors"
                aria-label={locale === "fr" ? "Fermer" : "Close"}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Image */}
            <div className="relative flex-1 min-h-[400px] bg-black/5 flex items-center justify-center p-4">
              <div className="relative w-full max-w-full max-h-[70vh] aspect-auto">
                <img
                  src={currentImage.imageUrl}
                  alt={currentImage.titleFr || currentImage.titleEn || "Gallery"}
                  className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                  onError={() => {
                    handleImageError(currentImage.id);
                    setSelectedImage(null);
                  }}
                />
              </div>
            </div>

            {/* Navigation */}
            {validItems.length > 1 && (
              <>
                <button
                  onClick={() => {
                    const currentValidIndex = validItems.findIndex(item => item.id === currentImage.id);
                    const prevIndex = (currentValidIndex - 1 + validItems.length) % validItems.length;
                    const prevItem = validItems[prevIndex];
                    const originalIndex = items.findIndex(item => item.id === prevItem.id);
                    setSelectedImage(originalIndex);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 text-black/70 hover:text-black transition-colors"
                  aria-label={locale === "fr" ? "Image précédente" : "Previous image"}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const currentValidIndex = validItems.findIndex(item => item.id === currentImage.id);
                    const nextIndex = (currentValidIndex + 1) % validItems.length;
                    const nextItem = validItems[nextIndex];
                    const originalIndex = items.findIndex(item => item.id === nextItem.id);
                    setSelectedImage(originalIndex);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 text-black/70 hover:text-black transition-colors"
                  aria-label={locale === "fr" ? "Image suivante" : "Next image"}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
