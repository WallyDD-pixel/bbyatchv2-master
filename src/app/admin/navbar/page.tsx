"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface NavbarItem {
  id: number;
  labelFr: string;
  labelEn: string;
  href: string;
  icon?: string;
  order: number;
  visible: boolean;
  target: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminNavbarPage() {
  const router = useRouter();
  const [items, setItems] = useState<NavbarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<NavbarItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draggedItem, setDraggedItem] = useState<NavbarItem | null>(null);

  // Formulaire pour nouvel élément ou édition
  const [formData, setFormData] = useState({
    labelFr: '',
    labelEn: '',
    href: '',
    icon: '',
    visible: true,
    target: '_self'
  });

  useEffect(() => {
    fetchNavbarItems();
  }, []);

  const fetchNavbarItems = async () => {
    try {
      // Utiliser l'API publique pour l'affichage
      const res = await fetch('/api/navbar');
      const data = await res.json();
      if (data.navbarItems) {
        setItems(data.navbarItems);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem 
        ? { ...formData, id: editingItem.id }
        : formData;

      const res = await fetch('/api/admin/navbar', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        await fetchNavbarItems();
        resetForm();
        alert(editingItem ? 'Élément mis à jour !' : 'Élément créé !');
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: NavbarItem) => {
    setEditingItem(item);
    setFormData({
      labelFr: item.labelFr,
      labelEn: item.labelEn,
      href: item.href,
      icon: item.icon || '',
      visible: item.visible,
      target: item.target
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cet élément ?')) return;

    try {
      const res = await fetch(`/api/admin/navbar?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchNavbarItems();
        alert('Élément supprimé !');
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      labelFr: '',
      labelEn: '',
      href: '',
      icon: '',
      visible: true,
      target: '_self'
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const handleDragStart = (e: React.DragEvent, item: NavbarItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetItem: NavbarItem) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    const newItems = [...items];
    const draggedIndex = newItems.findIndex(item => item.id === draggedItem.id);
    const targetIndex = newItems.findIndex(item => item.id === targetItem.id);

    // Réorganiser les éléments
    newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);

    // Mettre à jour l'ordre local
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index
    }));

    setItems(reorderedItems);
    setDraggedItem(null);

    // Sauvegarder l'ordre sur le serveur
    try {
      await fetch('/api/admin/navbar/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: reorderedItems })
      });
    } catch (error) {
      console.error('Erreur lors de la réorganisation:', error);
      // Recharger en cas d'erreur
      fetchNavbarItems();
    }
  };

  const toggleVisibility = async (item: NavbarItem) => {
    try {
      const res = await fetch('/api/admin/navbar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          visible: !item.visible
        })
      });

      if (res.ok) {
        await fetchNavbarItems();
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-10">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold shadow border border-gray-300"
          >
            <span>←</span> Retour
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">🧭 Administration de la Navigation</h1>
          <p className="text-sm text-black/60">
            Gérez les éléments de la barre de navigation : contenu, ordre et visibilité.
          </p>
        </div>

        {/* Bouton d'ajout */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:brightness-110 transition"
          >
            + Ajouter un élément
          </button>
        </div>

        {/* Liste des éléments */}
        <div className="bg-white rounded-xl border border-black/10 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-black/10">
            <h2 className="text-lg font-semibold">Éléments de navigation</h2>
            <p className="text-sm text-black/60 mt-1">
              Glissez-déposez pour réorganiser • Cliquez sur l'œil pour masquer/afficher
            </p>
          </div>
          
          {items.length === 0 ? (
            <div className="p-8 text-center text-black/60">
              <div className="text-4xl mb-4">🧭</div>
              <p>Aucun élément de navigation configuré</p>
              <p className="text-sm mt-2">Ajoutez votre premier élément pour commencer</p>
            </div>
          ) : (
            <div className="divide-y divide-black/10">
              {items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item)}
                  className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-move ${
                    !item.visible ? 'opacity-50' : ''
                  }`}
                >
                  {/* Icône de drag */}
                  <div className="text-gray-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </div>

                  {/* Icône */}
                  <div className="text-2xl w-8 text-center">
                    {item.icon || '📄'}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      🇫🇷 {item.labelFr} • 🇬🇧 {item.labelEn}
                    </div>
                    <div className="text-xs text-black/60 mt-1">
                      {item.href} {item.target === '_blank' && '(nouvel onglet)'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleVisibility(item)}
                      className={`p-2 rounded-lg transition-colors ${
                        item.visible 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={item.visible ? 'Masquer' : 'Afficher'}
                    >
                      {item.visible ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal d'ajout/édition */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingItem ? 'Modifier l\'élément' : 'Ajouter un élément'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Label français</label>
                  <input
                    type="text"
                    value={formData.labelFr}
                    onChange={(e) => setFormData({...formData, labelFr: e.target.value})}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    placeholder="Ex: Bateaux disponibles"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Label anglais</label>
                  <input
                    type="text"
                    value={formData.labelEn}
                    onChange={(e) => setFormData({...formData, labelEn: e.target.value})}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    placeholder="Ex: Available boats"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">URL</label>
                  <input
                    type="text"
                    value={formData.href}
                    onChange={(e) => setFormData({...formData, href: e.target.value})}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    placeholder="Ex: /?lang=fr#fleet"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Icône (emoji)</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    placeholder="Ex: ⛵"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cible</label>
                  <select
                    value={formData.target}
                    onChange={(e) => setFormData({...formData, target: e.target.value})}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                  >
                    <option value="_self">Même onglet</option>
                    <option value="_blank">Nouvel onglet</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="visible"
                    checked={formData.visible}
                    onChange={(e) => setFormData({...formData, visible: e.target.checked})}
                    className="h-4 w-4"
                  />
                  <label htmlFor="visible" className="text-sm">Visible</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:brightness-110 disabled:opacity-50 transition"
                  >
                    {saving ? 'Enregistrement...' : (editingItem ? 'Modifier' : 'Ajouter')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-black/5 text-black rounded-lg font-medium hover:bg-black/10 transition"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
