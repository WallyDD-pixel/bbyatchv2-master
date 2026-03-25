"use client";
import { useRef } from 'react';
import ImageGalleryManager from './ImageGalleryManager';
import FormSubmitHandler from './FormSubmitHandler';

interface UsedBoatEditFormProps {
  boat: any;
  locale: 'fr' | 'en';
  photoList: string[];
}

export default function UsedBoatEditForm({ boat, locale, photoList }: UsedBoatEditFormProps) {
  const newImageFilesRef = useRef<File[]>([]);

  return (
    <>
      <FormSubmitHandler newImageFilesRef={newImageFilesRef} />
      
      {/* Gestion images drag & drop */}
      <ImageGalleryManager 
        initialMainImage={boat.mainImage}
        initialPhotos={photoList}
        locale={locale}
        onNewFilesChange={(files) => {
          newImageFilesRef.current = files;
        }}
      />
    </>
  );
}
