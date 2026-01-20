"use client";
import { useState } from 'react';
import ImageGalleryManager from './ImageGalleryManager';
import FormSubmitHandler from './FormSubmitHandler';

interface UsedBoatEditFormProps {
  boat: any;
  locale: 'fr' | 'en';
  photoList: string[];
  children: React.ReactNode;
}

export default function UsedBoatEditForm({ boat, locale, photoList, children }: UsedBoatEditFormProps) {
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);

  return (
    <>
      <ImageGalleryManager 
        initialMainImage={boat.mainImage}
        initialPhotos={photoList}
        locale={locale}
        onNewFilesChange={setNewImageFiles}
      />
      <FormSubmitHandler newImageFiles={newImageFiles} />
      {children}
    </>
  );
}
