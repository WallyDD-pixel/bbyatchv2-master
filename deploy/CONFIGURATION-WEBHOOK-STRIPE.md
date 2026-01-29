# Configuration du Webhook Stripe

## 📋 Vérification que le webhook fonctionne

Le webhook Stripe est nécessaire pour :
- Marquer les réservations comme payées après un paiement réussi
- Supprimer automatiquement les réservations non payées en cas d'annulation

## 🔧 Configuration dans Stripe Dashboard

1. **Accéder au Dashboard Stripe** : https://dashboard.stripe.com
2. **Aller dans "Developers" > "Webhooks"**
3. **Cliquer sur "Add endpoint"**
4. **Configurer l'endpoint** :
   - **URL** : `https://votre-domaine.com/api/payments/webhook`
   - **Description** : "Webhook pour les paiements de réservations"
   - **Events to send** : Sélectionner les événements suivants :
     - `checkout.session.completed` (paiement réussi)
     - `checkout.session.canceled` (paiement annulé)
     - `checkout.session.expired` (session expirée)
     - `checkout.session.async_payment_failed` (paiement asynchrone échoué)

5. **Récupérer le "Signing secret"** :
   - Après création, cliquer sur l'endpoint
   - Copier le "Signing secret" (commence par `whsec_...`)
   - L'ajouter dans votre fichier `.env` :
     ```
     STRIPE_WEBHOOK_SECRET=whsec_...
     ```

## 🧪 Test du webhook

### 1. Vérifier les logs

Après avoir configuré le webhook, vous devriez voir dans les logs de l'application :

```
[webhook] ===== WEBHOOK RECEIVED =====
[webhook] Mode: test, Secret key present: true
[webhook] Body length: XXX bytes
[webhook] ✅ Event verified: checkout.session.completed (id: evt_...)
[webhook] Processing event type: checkout.session.completed
```

### 2. Tester avec Stripe CLI (recommandé pour le développement)

```bash
# Installer Stripe CLI
# https://stripe.com/docs/stripe-cli

# Se connecter
stripe login

# Écouter les webhooks localement
stripe listen --forward-to http://localhost:3003/api/payments/webhook

# Dans un autre terminal, déclencher un événement de test
stripe trigger checkout.session.completed
```

### 3. Vérifier dans le Dashboard Stripe

1. Aller dans "Developers" > "Webhooks"
2. Cliquer sur votre endpoint
3. Vérifier l'onglet "Events" pour voir les événements reçus
4. Vérifier que les événements sont marqués comme "Succeeded" (succès)

## 🔍 Dépannage

### Le webhook ne reçoit pas d'événements

1. **Vérifier l'URL** : L'URL doit être accessible publiquement (pas `localhost`)
2. **Vérifier le secret** : Le `STRIPE_WEBHOOK_SECRET` doit correspondre au "Signing secret" dans Stripe
3. **Vérifier les logs** : Regarder les logs de l'application pour voir les erreurs

### Erreur "Invalid signature"

- Vérifier que le `STRIPE_WEBHOOK_SECRET` est correct
- Vérifier que l'URL du webhook dans Stripe correspond exactement à votre endpoint
- Vérifier que vous utilisez le bon secret (test vs live)

### Les réservations ne sont pas supprimées après annulation

1. **Vérifier les logs** : Chercher `[webhook] Processing cancellation event`
2. **Vérifier que l'événement est bien envoyé** : Dans Stripe Dashboard > Webhooks > Events
3. **Vérifier que `stripeSessionId` est bien sauvegardé** : La réservation doit avoir le `stripeSessionId` correspondant

## 📝 Logs à surveiller

Les logs du webhook incluent maintenant :
- `[webhook] ===== WEBHOOK RECEIVED =====` : Webhook reçu
- `[webhook] ✅ Event verified` : Événement vérifié avec succès
- `[webhook] Processing event type` : Type d'événement traité
- `[webhook] ✅ Réservation ... supprimée` : Réservation supprimée avec succès
- `[webhook] ⚠️ Réservation ... non supprimée` : Réservation non supprimée (avec raison)
- `[webhook] ❌ Erreur` : Erreur lors du traitement

## 🚀 Mode Production

Pour la production :
1. Créer un endpoint webhook séparé pour le mode "live"
2. Utiliser le "Signing secret" du mode live
3. S'assurer que l'URL est en HTTPS
4. Tester avec un paiement réel de faible montant

## ⚠️ Important

- Le webhook doit répondre avec un code 200 dans les 5 secondes
- Stripe réessaiera automatiquement si le webhook échoue
- Les événements sont idempotents (peuvent être traités plusieurs fois sans problème)
