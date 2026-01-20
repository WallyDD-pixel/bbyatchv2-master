"use client";
import { useState } from 'react';
import ImageGalleryManager from './ImageGalleryManager';
import FormSubmitHandler from './FormSubmitHandler';

interface UsedBoatEditFormProps {
  boat: any;
  locale: 'fr' | 'en';
  photoList: string[];
}

export default function UsedBoatEditForm({ boat, locale, photoList }: UsedBoatEditFormProps) {
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);

  return (
    <>
      <FormSubmitHandler newImageFiles={newImageFiles} />
      
      {/* Gestion images drag & drop */}
      <ImageGalleryManager 
        initialMainImage={boat.mainImage}
        initialPhotos={photoList}
        locale={locale}
        onNewFilesChange={setNewImageFiles}
      />
    </>
  );
}
