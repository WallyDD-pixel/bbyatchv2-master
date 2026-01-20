"use client";
import { useState, useRef, useEffect } from 'react';

export default function UsedBoatEditClient({ boat, locale }: { boat: any; locale: "fr" | "en" }) {
  const [videosList, setVideosList] = useState<string[]>(() => {
    if (!boat.videoUrls) return [];
    try {
      const parsed = typeof boat.videoUrls === 'string' ? JSON.parse(boat.videoUrls) : boat.videoUrls;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [videoInput, setVideoInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoFilesInputRef = useRef<HTMLInputElement>(null);

  const parseVideos = (txt: string) => {
    const s = txt.trim();
    if (!s) return [] as string[];
    if (s.startsWith("[") && s.endsWith("]")) {
      try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr : []; } catch { return []; }
    }
    return s.split(",").map(x => x.trim()).filter(Boolean);
  };

  const addVideosUrlsFromText = () => {
    const arr = parseVideos(videoInput);
    if (arr.length) {
      setVideosList(v => Array.from(new Set([...v, ...arr])));
      setVideoInput('');
    }
  };

  const removeVideo = (url: string) => {
    if (!confirm(locale === 'fr' ? 'Supprimer cette vidéo ?' : 'Remove this video?')) return;
    setVideosList(v => v.filter(x => x !== url));
  };

  const onUploadVideos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('id', String(boat.id));
      // Ajouter les vidéos existantes
      if (videosList.length) fd.append('existingVideos', JSON.stringify(videosList));
      // Ajouter les nouveaux fichiers
      Array.from(files).forEach(f => fd.append('videoFiles', f));
      
      const res = await fetch('/api/admin/used-boats/update-videos', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('upload_failed');
      const data = await res.json();
      if (Array.isArray(data.videoUrls)) {
        setVideosList(data.videoUrls);
      }
    } catch (e) {
      alert(locale === 'fr' ? 'Erreur lors de l\'upload' : 'Upload error');
    } finally {
      setUploading(false);
      if (videoFilesInputRef.current) videoFilesInputRef.current.value = '';
    }
  };

  // Mettre à jour le champ caché pour les vidéos
  useEffect(() => {
    const hiddenInput = document.getElementById('videoUrlsInput') as HTMLInputElement;
    if (hiddenInput) {
      hiddenInput.value = videosList.length ? JSON.stringify(videosList) : '';
    }
  }, [videosList]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{locale === "fr" ? "Vidéos" : "Videos"}</h3>
      
      {/* Ajout par URL */}
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">{locale === "fr" ? "Ajouter des vidéos par URL" : "Add videos by URL"}</span>
          <div className="flex gap-2">
            <input
              ref={videoInputRef}
              type="text"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVideosUrlsFromText())}
              placeholder={locale === "fr" ? "URL YouTube, Vimeo ou fichier vidéo (séparées par des virgules)" : "YouTube, Vimeo or video file URLs (comma separated)"}
              className="flex-1 h-10 rounded-lg border border-black/15 px-3 text-sm"
            />
            <button
              type="button"
              onClick={addVideosUrlsFromText}
              className="px-4 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              {locale === "fr" ? "Ajouter" : "Add"}
            </button>
          </div>
          <p className="text-xs text-black/50">
            {locale === "fr" 
              ? "Exemples: https://youtube.com/watch?v=..., https://vimeo.com/..., https://example.com/video.mp4"
              : "Examples: https://youtube.com/watch?v=..., https://vimeo.com/..., https://example.com/video.mp4"}
          </p>
        </label>
      </div>

      {/* Upload de fichiers vidéo */}
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">{locale === "fr" ? "Uploader des fichiers vidéo" : "Upload video files"}</span>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 h-10 inline-flex items-center text-sm transition-colors">
              {uploading ? (locale === 'fr' ? 'Téléversement…' : 'Uploading…') : (locale === 'fr' ? 'Choisir des fichiers vidéo' : 'Choose video files')}
            </span>
            <input
              ref={videoFilesInputRef}
              type="file"
              accept="video/*"
              multiple
              disabled={uploading}
              onChange={onUploadVideos}
              className="hidden"
            />
          </label>
          <p className="text-xs text-black/50">
            {locale === "fr" 
              ? "Formats acceptés: MP4, WebM, OGG (max 100MB par fichier)"
              : "Accepted formats: MP4, WebM, OGG (max 100MB per file)"}
          </p>
        </label>
      </div>

      {/* Liste des vidéos */}
      {videosList.length === 0 && (
        <p className="text-sm text-black/50">{locale === 'fr' ? 'Aucune vidéo ajoutée.' : 'No videos added.'}</p>
      )}
      {videosList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {videosList.map((url, i) => {
            const isYouTube = /youtube\.com|youtu\.be/.test(url);
            const isVimeo = /vimeo\.com/.test(url);
            const isVideoFile = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
            
            return (
              <div key={i} className="relative border border-black/10 rounded-lg overflow-hidden bg-black/5">
                <div className="aspect-video relative">
                  {isYouTube || isVimeo ? (
                    <div className="w-full h-full flex items-center justify-center bg-black/10">
                      <span className="text-4xl">▶</span>
                    </div>
                  ) : isVideoFile ? (
                    <video src={url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black/10">
                      <span className="text-sm text-black/50">{locale === 'fr' ? 'URL vidéo' : 'Video URL'}</span>
                    </div>
                  )}
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-xs text-black/60 truncate flex-1">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeVideo(url)}
                    className="ml-2 px-2 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600"
                  >
                    {locale === 'fr' ? 'Supprimer' : 'Remove'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Champ caché pour le formulaire */}
      <input type="hidden" id="videoUrlsInput" name="videoUrls" value={videosList.length ? JSON.stringify(videosList) : ''} />
    </div>
  );
}

