"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";
import { submitForm } from "@/lib/form-utils";
import AdminInstructions from "@/components/AdminInstructions";

export default function AdminAboutSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]); // Stocker les fichiers réels pour l'upload
  const [historyImagePreview, setHistoryImagePreview] = useState<string | null>(null);
  const [teamImagePreview, setTeamImagePreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // Afficher un message de succès si présent dans l'URL
  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setToast({ message: "Paramètres sauvegardés avec succès", type: "success" });
      // Nettoyer l'URL après affichage du message
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchSettings() {
      const res = await fetch("/api/admin/about-settings");
      const s = await res.json();
      setSettings(s);
      // Charger les images existantes
      if (s?.aboutImageUrls) {
        try {
          const arr = JSON.parse(s.aboutImageUrls);
          if (Array.isArray(arr)) {
            setImagePreviews(arr);
            // Réinitialiser les fichiers car ce sont des URLs existantes
            setImageFiles([]);
          }
        } catch {}
      } else {
        // Pas d'images existantes, réinitialiser
        setImagePreviews([]);
        setImageFiles([]);
      }
      // Charger les images Histoire et Équipe
      if (s?.aboutHistoryImageUrl) setHistoryImagePreview(s.aboutHistoryImageUrl);
      if (s?.aboutTeamImageUrl) setTeamImagePreview(s.aboutTeamImageUrl);
    }
    fetchSettings();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const newPreviews: string[] = [...imagePreviews];
    const newFiles: File[] = [...imageFiles];
    let loadedCount = 0;
    const totalToLoad = fileArray.length;
    
    console.log(`📸 Adding ${totalToLoad} new image(s)...`);
    
    fileArray.forEach((file) => {
      // Vérifier la taille (max 10MB par fichier)
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`⚠️ File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB), skipping`);
        loadedCount++;
        if (loadedCount === totalToLoad) {
          setImagePreviews([...newPreviews]);
          setImageFiles([...newFiles]);
        }
        return;
      }
      
      // Stocker le fichier réel
      newFiles.push(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        loadedCount++;
        
        // Mettre à jour l'état après chaque fichier chargé pour un feedback immédiat
        setImagePreviews([...newPreviews]);
        setImageFiles([...newFiles]);
        
        if (loadedCount === totalToLoad) {
          console.log(`✅ Added ${loadedCount} image(s) to preview and files array`);
        }
      };
      reader.onerror = () => {
        console.error(`❌ Error reading file: ${file.name}`);
        // Retirer le fichier en cas d'erreur
        const index = newFiles.indexOf(file);
        if (index > -1) {
          newFiles.splice(index, 1);
        }
        loadedCount++;
        if (loadedCount === totalToLoad) {
          setImagePreviews([...newPreviews]);
          setImageFiles([...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Réinitialiser l'input pour permettre de sélectionner les mêmes fichiers à nouveau
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    setImageFiles(newFiles);
    console.log(`🗑️ Removed image at index ${index}, ${newPreviews.length} image(s) remaining`);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Empêcher la double soumission
    if (saving) return;
    
    setSaving(true);
    setToast(null);
    
    const formData = new FormData(e.currentTarget);
    
    // Séparer les nouvelles images (data URLs) et les existantes
    const existingImages: string[] = [];
    const galleryInput = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"][name="imageFiles"]');
    
    console.log('🔍 Analyzing image previews...');
    console.log('  - Total imagePreviews:', imagePreviews.length);
    
    // Parcourir les previews et déterminer quelles images existantes conserver
    imagePreviews.forEach((url, index) => {
      // Si c'est une URL existante (pas un data URL ou blob URL) = déjà sauvegardée dans Supabase
      if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
        existingImages.push(url);
        console.log(`  ✓ Keeping existing image ${index}:`, url.substring(0, 80) + '...');
      } else if (url && (url.startsWith('data:') || url.startsWith('blob:'))) {
        console.log(`  📸 Preview ${index} is a data/blob URL (new image to upload)`);
      }
    });
    
    // Ajouter les images existantes à conserver
    existingImages.forEach(url => {
      if (url && url.trim()) {
        formData.append('existingImages', url);
      }
    });
    console.log('  - Existing images to keep:', existingImages.length);
    
    // Ajouter les fichiers d'images spécifiques (Histoire et Équipe)
    const historyImageInput = e.currentTarget.querySelector<HTMLInputElement>('input[name="aboutHistoryImageFile"]');
    if (historyImageInput?.files && historyImageInput.files[0]) {
      formData.append('aboutHistoryImageFile', historyImageInput.files[0]);
      console.log('  📷 History image file:', historyImageInput.files[0].name);
    }
    
    const teamImageInput = e.currentTarget.querySelector<HTMLInputElement>('input[name="aboutTeamImageFile"]');
    if (teamImageInput?.files && teamImageInput.files[0]) {
      formData.append('aboutTeamImageFile', teamImageInput.files[0]);
      console.log('  📷 Team image file:', teamImageInput.files[0].name);
    }
    
    // Ajouter TOUS les fichiers stockés dans l'état (plus fiable que de lire depuis l'input)
    let newFilesCount = 0;
    imageFiles.forEach((file, index) => {
      if (file && file.size > 0) {
        formData.append('imageFiles', file);
        newFilesCount++;
        console.log(`  ✅ Adding file ${newFilesCount} from state:`, file.name, `(${(file.size / 1024).toFixed(2)} KB)`, file.type || 'no type');
      }
    });
    
    // Si pas de fichiers dans l'état, essayer de lire depuis l'input (fallback)
    if (newFilesCount === 0 && galleryInput && galleryInput.files && galleryInput.files.length > 0) {
      for (let i = 0; i < galleryInput.files.length; i++) {
        const file = galleryInput.files[i];
        if (file && file.size > 0) {
          formData.append('imageFiles', file);
          newFilesCount++;
          console.log(`  ✅ Adding file ${newFilesCount} from input (fallback):`, file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
        }
      }
    }
    
    // Compter aussi les nouvelles images (data URLs) qui n'ont pas encore de fichier associé
    const newDataUrls = imagePreviews.filter(url => url && (url.startsWith('data:') || url.startsWith('blob:')));
    console.log('  - New data URLs (previews):', newDataUrls.length);
    console.log('  - Files in state:', imageFiles.length);
    
    console.log('📤 Form submission summary:');
    console.log('  - Existing images to keep:', existingImages.length);
    console.log('  - New files to upload:', newFilesCount);
    console.log('  - New data URL previews:', newDataUrls.length);
    
    // Vérifier que les fichiers sont bien dans le FormData
    const allFiles = formData.getAll('imageFiles');
    console.log('  - Files in FormData:', allFiles.length);
    if (allFiles.length === 0 && existingImages.length === 0) {
      console.warn('  ⚠️ WARNING: No images to save! (no existing + no new files)');
    }

    try {
      const result = await submitForm("/api/admin/about-settings", formData, {
        successMessage: "Paramètres sauvegardés avec succès",
        errorMessage: "Erreur lors de la sauvegarde",
        redirectUrl: "/admin/about-settings?success=1",
      });

      if (result.success) {
        // Afficher le message de succès
        setToast({ message: "Paramètres sauvegardés avec succès", type: "success" });
        
        // Recharger immédiatement les données pour voir les nouvelles images
        try {
          const res = await fetch("/api/admin/about-settings");
          const s = await res.json();
          setSettings(s);
          
          // Recharger les images existantes depuis la base de données
          if (s?.aboutImageUrls) {
            try {
              const arr = JSON.parse(s.aboutImageUrls);
              if (Array.isArray(arr) && arr.length > 0) {
                setImagePreviews(arr);
                // Réinitialiser les fichiers car ce sont maintenant des URLs sauvegardées
                setImageFiles([]);
                console.log('✅ Reloaded', arr.length, 'images from database:', arr);
              } else {
                setImagePreviews([]);
                setImageFiles([]);
                console.log('⚠️ aboutImageUrls is empty array');
              }
            } catch (e) {
              console.error('❌ Error parsing aboutImageUrls:', e);
              setImagePreviews([]);
              setImageFiles([]);
            }
          } else {
            setImagePreviews([]);
            setImageFiles([]);
            console.log('⚠️ No aboutImageUrls in settings after save');
          }
          
          // Recharger aussi les images Histoire et Équipe
          if (s?.aboutHistoryImageUrl) {
            setHistoryImagePreview(s.aboutHistoryImageUrl);
          }
          if (s?.aboutTeamImageUrl) {
            setTeamImagePreview(s.aboutTeamImageUrl);
          }
          
          router.refresh();
        } catch (error) {
          console.error('❌ Error reloading settings:', error);
          setToast({ message: "Paramètres sauvegardés mais erreur lors du rechargement", type: "error" });
        }
      } else {
        // Afficher l'erreur
        const errorMsg = result.error || "Erreur lors de la sauvegarde";
        setToast({ 
          message: errorMsg, 
          type: "error" 
        });
        console.error('❌ Save failed:', result);
      }
    } catch (error: any) {
      console.error('❌ Error in handleSubmit:', error);
      setToast({ 
        message: error?.message || "Erreur lors de la sauvegarde", 
        type: "error" 
      });
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="max-w-3xl mx-auto py-8">Chargement…</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <Link 
        href="/admin" 
        className="mb-6 inline-block text-sm rounded-full border-2 border-blue-400 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium"
      >
        ← Retour au tableau de bord
      </Link>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Paramètres de la page "A propos"</h1>
        <AdminInstructions
          locale="fr"
          title="Comment modifier la page A propos"
          instructions={[
            {
              title: "Galerie d'images",
              description: "Ajoutez plusieurs images pour la section principale. Vous pouvez télécharger plusieurs images à la fois et les supprimer individuellement."
            },
            {
              title: "Section Histoire",
              description: "Modifiez le titre, le contenu et l'image de la section qui raconte l'histoire de votre entreprise."
            },
            {
              title: "Section Équipe",
              description: "Modifiez le titre, le contenu et l'image de la section qui présente votre équipe."
            },
            {
              title: "Gérer les images",
              description: "Toutes les images sont stockées sur Supabase Storage. Les images existantes sont conservées, seules les nouvelles sont téléchargées."
            },
            {
              title: "Sauvegarder",
              description: "N'oubliez pas de cliquer sur 'Enregistrer' après avoir effectué vos modifications pour qu'elles soient prises en compte."
            }
          ]}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Histoire */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Histoire</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Histoire (FR) *</label>
              <textarea
                name="aboutHistoryFr"
                defaultValue={settings.aboutHistoryFr || ''}
                required
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="L'histoire de BB YACHTS, BB CHARTER et BB SERVICES CHARTER..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Histoire (EN) *</label>
              <textarea
                name="aboutHistoryEn"
                defaultValue={settings.aboutHistoryEn || ''}
                required
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="The story of BB YACHTS, BB CHARTER and BB SERVICES CHARTER..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Image de la section Histoire</label>
              <input
                type="file"
                name="aboutHistoryImageFile"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setHistoryImagePreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setHistoryImagePreview(settings?.aboutHistoryImageUrl || null);
                  }
                }}
                className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
              />
              {(historyImagePreview || settings?.aboutHistoryImageUrl) && (
                <div className="mt-3">
                  <img
                    src={historyImagePreview || settings?.aboutHistoryImageUrl || ''}
                    alt="Prévisualisation"
                    className="max-w-xs h-32 object-cover rounded-lg border border-black/10"
                  />
                  <input type="hidden" name="aboutHistoryImageUrl" value={settings?.aboutHistoryImageUrl || ''} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Mission</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mission (FR) *</label>
              <textarea
                name="aboutMissionFr"
                defaultValue={settings.aboutMissionFr || ''}
                required
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="Notre mission..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mission (EN) *</label>
              <textarea
                name="aboutMissionEn"
                defaultValue={settings.aboutMissionEn || ''}
                required
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="Our mission..."
              />
            </div>
          </div>
        </section>

        {/* Équipe */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Équipe et Expertise</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Équipe et Expertise (FR) *</label>
              <textarea
                name="aboutTeamFr"
                defaultValue={settings.aboutTeamFr || ''}
                required
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="Notre équipe et notre expertise locale..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Équipe et Expertise (EN) *</label>
              <textarea
                name="aboutTeamEn"
                defaultValue={settings.aboutTeamEn || ''}
                required
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="Our team and local expertise..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Image de la section Équipe</label>
              <input
                type="file"
                name="aboutTeamImageFile"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setTeamImagePreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setTeamImagePreview(settings?.aboutTeamImageUrl || null);
                  }
                }}
                className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
              />
              {(teamImagePreview || settings?.aboutTeamImageUrl) && (
                <div className="mt-3">
                  <img
                    src={teamImagePreview || settings?.aboutTeamImageUrl || ''}
                    alt="Prévisualisation"
                    className="max-w-xs h-32 object-cover rounded-lg border border-black/10"
                  />
                  <input type="hidden" name="aboutTeamImageUrl" value={settings?.aboutTeamImageUrl || ''} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Valeurs */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Nos Valeurs</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sécurité */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Sécurité (FR) *</label>
              <textarea
                name="aboutValuesSafetyFr"
                defaultValue={settings.aboutValuesSafetyFr || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
              <label className="block text-sm font-medium">Sécurité (EN) *</label>
              <textarea
                name="aboutValuesSafetyEn"
                defaultValue={settings.aboutValuesSafetyEn || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            {/* Confort */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Confort (FR) *</label>
              <textarea
                name="aboutValuesComfortFr"
                defaultValue={settings.aboutValuesComfortFr || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
              <label className="block text-sm font-medium">Confort (EN) *</label>
              <textarea
                name="aboutValuesComfortEn"
                defaultValue={settings.aboutValuesComfortEn || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            {/* Authenticité */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Authenticité (FR) *</label>
              <textarea
                name="aboutValuesAuthFr"
                defaultValue={settings.aboutValuesAuthFr || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
              <label className="block text-sm font-medium">Authenticité (EN) *</label>
              <textarea
                name="aboutValuesAuthEn"
                defaultValue={settings.aboutValuesAuthEn || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            {/* Plaisir */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Plaisir (FR) *</label>
              <textarea
                name="aboutValuesPleasureFr"
                defaultValue={settings.aboutValuesPleasureFr || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
              <label className="block text-sm font-medium">Plaisir (EN) *</label>
              <textarea
                name="aboutValuesPleasureEn"
                defaultValue={settings.aboutValuesPleasureEn || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
          </div>
        </section>

        {/* Galerie d'images */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Galerie d'images</h2>
          <div>
            {/* Zone de drop et input multiple */}
            <div className="mb-4">
              <label className="block mb-2">
                <div className="border-2 border-dashed border-black/20 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors">
                  <input
                    type="file"
                    name="imageFiles"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="gallery-image-input"
                  />
                  <label htmlFor="gallery-image-input" className="cursor-pointer">
                    <svg className="mx-auto h-12 w-12 text-black/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-sm font-medium text-black/70">Cliquez pour sélectionner ou glissez-déposez</p>
                    <p className="text-xs text-black/50 mt-1">Vous pouvez sélectionner plusieurs images à la fois</p>
                  </label>
                </div>
              </label>
            </div>

            {/* Prévisualisation des images */}
            {imagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imagePreviews.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg border border-black/10 bg-black/5 overflow-hidden">
                      {url ? (
                        <img 
                          src={url} 
                          alt={`Preview ${index + 1}`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Error loading image:', url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-black/30 text-xs">Aucune image</div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                        title="Supprimer cette image"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-black/50 py-8 border border-dashed border-black/20 rounded-lg">
                Aucune image. Sélectionnez des images ci-dessus pour commencer.
              </div>
            )}
          </div>
        </section>

        {/* Boutons */}
        <div className="flex justify-end gap-4 pt-4 border-t border-black/10 mt-6">
          <a
            href="/admin"
            className="px-6 h-11 rounded-full border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium inline-flex items-center justify-center transition-colors duration-200"
          >
            Annuler
          </a>
          <button
            type="submit"
            disabled={saving}
            className="px-6 h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow"
            style={{ backgroundColor: saving ? '#60a5fa' : '#2563eb' }}
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

