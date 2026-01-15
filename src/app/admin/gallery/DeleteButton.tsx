"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({ 
  imageId, 
  locale 
}: { 
  imageId: number; 
  locale: "fr" | "en" 
}) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirm(locale === "fr" ? "Supprimer cette image ?" : "Delete this image?")) {
      return;
    }

    setDeleting(true);

    try {
      const formData = new FormData();
      formData.append("_method", "DELETE");

      const response = await fetch(`/api/admin/gallery/${imageId}`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert(locale === "fr" ? "Erreur lors de la suppression" : "Error deleting");
        setDeleting(false);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      alert(locale === "fr" ? "Erreur lors de la suppression" : "Error deleting");
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {deleting 
        ? (locale === "fr" ? "Suppression..." : "Deleting...") 
        : (locale === "fr" ? "Supprimer" : "Delete")
      }
    </button>
  );
}





