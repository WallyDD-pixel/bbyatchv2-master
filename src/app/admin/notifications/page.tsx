"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const res = await fetch("/api/admin/general-settings");
      const s = await res.json();
      setSettings(s);
    }
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        body: formData,
      });
      
      if (res.ok || res.status === 307 || res.status === 308) {
        // Succès ou redirect
        router.push("/admin/notifications?success=1");
        router.refresh();
      } else {
        // Erreur - lire le message détaillé
        let errorMessage = "Erreur lors de la sauvegarde";
        try {
          const errorData = await res.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch {
          // Si pas de JSON, utiliser le message par défaut
        }
        alert(errorMessage);
        console.error("Erreur de sauvegarde:", errorMessage);
      }
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert(error?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async (type: string = 'basic') => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/notifications/test", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Email de test "${type}" envoyé ! Vérifiez votre boîte de réception.`);
      } else {
        const data = await res.json();
        alert(`Erreur: ${data.error || 'Impossible d\'envoyer l\'email de test'}`);
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'envoi de l'email de test");
    } finally {
      setTesting(false);
    }
  };

  if (!settings) return <div className="min-h-screen flex items-center justify-center">Chargement…</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-10">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold shadow border border-gray-300"
          >
            <span>←</span> Retour
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Notifications par email</h1>
          <p className="text-sm text-black/60">
            Configurez les notifications automatiques envoyées par email.
          </p>
        </div>

        {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') === '1' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Paramètres sauvegardés avec succès !
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Configuration SMTP */}
          <div className="bg-white rounded-xl border border-black/10 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Configuration SMTP</h2>
            <p className="text-xs text-black/50 mb-4">
              Configurez votre serveur SMTP pour envoyer des emails. Exemples : Gmail, Outlook, SendGrid, etc.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="font-medium text-sm mb-1 block">Serveur SMTP</span>
                  <input
                    type="text"
                    name="smtpHost"
                    defaultValue={settings?.smtpHost || ''}
                    placeholder="smtp.gmail.com"
                    className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="font-medium text-sm mb-1 block">Port</span>
                  <input
                    type="number"
                    name="smtpPort"
                    defaultValue={settings?.smtpPort || 587}
                    placeholder="587"
                    className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block">
                <span className="font-medium text-sm mb-1 block">Utilisateur SMTP</span>
                <input
                  type="text"
                  name="smtpUser"
                  defaultValue={settings?.smtpUser || ''}
                  placeholder="votre-email@gmail.com"
                  className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="font-medium text-sm mb-1 block">Mot de passe SMTP</span>
                <input
                  type="password"
                  name="smtpPassword"
                  defaultValue={settings?.smtpPassword || ''}
                  placeholder="••••••••"
                  className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-black/50 mt-1">
                  Pour Gmail, utilisez un "Mot de passe d'application" (pas votre mot de passe normal).
                </p>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="font-medium text-sm mb-1 block">Email expéditeur</span>
                  <input
                    type="email"
                    name="smtpFromEmail"
                    defaultValue={settings?.smtpFromEmail || 'noreply@bb-yachts.com'}
                    placeholder="noreply@bb-yachts.com"
                    className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="font-medium text-sm mb-1 block">Nom expéditeur</span>
                  <input
                    type="text"
                    name="smtpFromName"
                    defaultValue={settings?.smtpFromName || 'BB YACHTS'}
                    placeholder="BB YACHTS"
                    className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="pt-4 border-t border-black/10">
                <p className="text-xs text-black/50 mb-4">
                  Testez différents types d'emails pour vérifier que tout fonctionne correctement :
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTestEmail('basic')}
                    disabled={testing}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {testing ? "..." : "📧 Test basique"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestEmail('reservation')}
                    disabled={testing}
                    className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {testing ? "..." : "⛵ Réservation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestEmail('payment')}
                    disabled={testing}
                    className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {testing ? "..." : "💳 Paiement"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestEmail('agency')}
                    disabled={testing}
                    className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {testing ? "..." : "🏢 Demande agence"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestEmail('contact')}
                    disabled={testing}
                    className="px-3 py-2 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {testing ? "..." : "📮 Message contact"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestEmail('status-change')}
                    disabled={testing}
                    className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {testing ? "..." : "🔄 Changement statut"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestEmail('account-created')}
                    disabled={testing}
                    className="px-3 py-2 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {testing ? "..." : "👤 Création compte"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestEmail('welcome')}
                    disabled={testing}
                    className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {testing ? "..." : "👋 Email bienvenue"}
                  </button>
                </div>
                <p className="text-xs text-black/50 mt-3">
                  Les emails de test seront envoyés à l'adresse configurée ci-dessous.
                </p>
              </div>
            </div>
          </div>

          {/* Email destinataire */}
          <div className="bg-white rounded-xl border border-black/10 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Email destinataire</h2>
            <label className="block">
              <span className="font-medium text-sm mb-1 block">Email pour recevoir les notifications</span>
              <input
                type="email"
                name="notificationEmailTo"
                defaultValue={settings?.notificationEmailTo || 'charter@bb-yachts.com'}
                placeholder="charter@bb-yachts.com"
                className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-black/50 mt-1">
                Toutes les notifications seront envoyées à cette adresse email.
              </p>
            </label>
          </div>

          {/* Types de notifications */}
          <div className="bg-white rounded-xl border border-black/10 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Types de notifications</h2>
            <p className="text-xs text-black/50 mb-4">
              Activez ou désactivez les différents types de notifications.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="notificationEmailEnabled"
                  defaultChecked={settings?.notificationEmailEnabled !== false}
                  className="h-4 w-4 accent-blue-600"
                />
                <div>
                  <span className="font-medium text-sm">Activer toutes les notifications</span>
                  <p className="text-xs text-black/50">Désactiver cette option désactive toutes les notifications.</p>
                </div>
              </label>
              <div className="pl-7 space-y-3 border-l-2 border-blue-200 ml-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="notificationEmailReservation"
                    defaultChecked={settings?.notificationEmailReservation !== false}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <div>
                    <span className="font-medium text-sm">Nouvelle réservation</span>
                    <p className="text-xs text-black/50">Notification lorsqu'une nouvelle réservation est créée.</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="notificationEmailReservationStatusChange"
                    defaultChecked={settings?.notificationEmailReservationStatusChange !== false}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <div>
                    <span className="font-medium text-sm">Changement de statut de réservation</span>
                    <p className="text-xs text-black/50">Notification lorsqu'une réservation change de statut (acompte payé, terminée, etc.).</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="notificationEmailAgencyRequest"
                    defaultChecked={settings?.notificationEmailAgencyRequest !== false}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <div>
                    <span className="font-medium text-sm">Nouvelle demande d'agence</span>
                    <p className="text-xs text-black/50">Notification lorsqu'une agence crée une nouvelle demande.</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="notificationEmailAgencyRequestStatusChange"
                    defaultChecked={settings?.notificationEmailAgencyRequestStatusChange !== false}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <div>
                    <span className="font-medium text-sm">Changement de statut de demande d'agence</span>
                    <p className="text-xs text-black/50">Notification lorsqu'une demande d'agence est approuvée, rejetée ou convertie.</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="notificationEmailContactMessage"
                    defaultChecked={settings?.notificationEmailContactMessage !== false}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <div>
                    <span className="font-medium text-sm">Nouveau message de contact</span>
                    <p className="text-xs text-black/50">Notification lorsqu'un nouveau message est reçu via le formulaire de contact.</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="notificationEmailPaymentReceived"
                    defaultChecked={settings?.notificationEmailPaymentReceived !== false}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <div>
                    <span className="font-medium text-sm">Paiement reçu</span>
                    <p className="text-xs text-black/50">Notification lorsqu'un paiement (acompte) est reçu.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-black/10 mt-6">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="px-6 py-2.5 border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
