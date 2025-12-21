 "use client";

 import { useTransition } from "react";

 export function DeleteBoatButton({ id, locale }: { id: number; locale: "fr" | "en" }) {
   const [isPending, startTransition] = useTransition();

   const handleDelete = () => {
     if (!confirm(locale === "fr" ? "Supprimer ce bateau ?" : "Delete this boat?")) return;
     startTransition(async () => {
       try {
         const res = await fetch(`/api/admin/boats/${id}`, { method: "DELETE" });
         if (!res.ok) {
           alert(locale === "fr" ? "Échec de la suppression." : "Failed to delete boat.");
           return;
         }
         // Recharger la page pour mettre la liste à jour
         window.location.reload();
       } catch {
         alert(locale === "fr" ? "Erreur réseau lors de la suppression." : "Network error while deleting.");
       }
     });
   };

   return (
     <button
       type="button"
       onClick={handleDelete}
       disabled={isPending}
       className="inline-flex items-center rounded-full border border-red-500/40 text-red-600 text-xs h-8 px-3 hover:bg-red-50 disabled:opacity-60"
     >
       {locale === "fr" ? "Supprimer" : "Delete"}
     </button>
   );
 }


