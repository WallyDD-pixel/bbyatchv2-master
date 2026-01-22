"use client";
import { useEffect, useState } from 'react';
import AdminInstructions from "@/components/AdminInstructions";

export default function AdminCitiesPage(){
    const [cities, setCities] = useState<{name:string}[]>([]);
    const [name, setName] = useState('');
    const [renaming, setRenaming] = useState<string|null>(null);
    const [newName, setNewName] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async ()=>{
        const res = await fetch('/admin/api/cities', { cache: 'no-store' });
        const json = await res.json();
        setCities(json.cities||[]);
    };
    useEffect(()=>{ load(); },[]);

    const add = async ()=>{
        if(!name.trim()) return;
        setBusy(true);
        await fetch('/admin/api/cities', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: name.trim() }) });
        setName('');
        await load();
        setBusy(false);
    };

    const remove = async (n:string)=>{
        if(!confirm(`Supprimer la ville "${n}" ?`)) return;
        setBusy(true);
        await fetch(`/admin/api/cities?name=${encodeURIComponent(n)}`, { method:'DELETE' });
        await load();
        setBusy(false);
    };

    const saveRename = async ()=>{
        if(!renaming) return; const trimmed = newName.trim(); if(!trimmed) return;
        setBusy(true);
        // on utilise DELETE + POST pour renommer par name (évite la question d'ID)
        await fetch(`/admin/api/cities?name=${encodeURIComponent(renaming)}`, { method:'DELETE' });
        await fetch('/admin/api/cities', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: trimmed }) });
        setRenaming(null); setNewName('');
        await load();
        setBusy(false);
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="mb-6">
                <div className="mb-4 flex items-center gap-3">
                    <button type="button" onClick={()=>history.back()} className="px-3 py-1.5 rounded border">← Retour</button>
                    <h1 className="text-xl font-bold">Villes proposées</h1>
                </div>
                <AdminInstructions
                    locale="fr"
                    title="Comment gérer les villes"
                    instructions={[
                        {
                            title: "Ajouter une ville",
                            description: "Tapez le nom de la ville dans le champ et cliquez sur 'Ajouter'. La ville sera disponible pour la sélection lors de la création de bateaux."
                        },
                        {
                            title: "Renommer une ville",
                            description: "Cliquez sur 'Renommer' pour modifier le nom d'une ville existante. Cette action mettra à jour tous les bateaux associés."
                        },
                        {
                            title: "Supprimer une ville",
                            description: "Cliquez sur 'Supprimer' pour retirer une ville. Attention : les bateaux associés à cette ville ne pourront plus l'utiliser."
                        },
                        {
                            title: "Utilisation",
                            description: "Les villes sont utilisées pour filtrer les bateaux lors de la recherche et pour définir le port de départ des réservations."
                        }
                    ]}
                />
            </div>
            <div className="flex gap-2 mb-4">
                <input className="border rounded px-3 py-2 flex-1" placeholder="Nouvelle ville" value={name} onChange={e=>setName(e.target.value)} />
                <button onClick={add} disabled={busy || !name.trim()} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Ajouter</button>
            </div>
            <ul className="space-y-2">
                {cities.map((c)=> (
                    <li key={c.name} className="flex items-center gap-2 border rounded p-2">
                        {renaming===c.name ? (
                            <>
                                <input className="border rounded px-2 py-1 flex-1" value={newName} onChange={e=>setNewName(e.target.value)} />
                                <button onClick={saveRename} className="px-2 py-1 rounded bg-green-600 text-white">OK</button>
                                <button onClick={()=>{setRenaming(null); setNewName('');}} className="px-2 py-1 rounded">Annuler</button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1">{c.name}</span>
                                <button onClick={()=>{setRenaming(c.name); setNewName(c.name);}} className="px-2 py-1 rounded bg-amber-500 text-white">Renommer</button>
                                <button onClick={()=>remove(c.name)} className="px-2 py-1 rounded bg-red-600 text-white">Supprimer</button>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
