import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any;

async function main() {
  // Page CGU / Mentions (Terms)
  const termsPage = await (prisma as any).legalPage.upsert({
    where: { slug: 'terms' },
    update: {},
    create: {
      slug: 'terms',
      titleFr: 'CGU / Mentions légales',
      titleEn: 'Terms & Notices',
      introFr: 'Les présentes Conditions Générales d\'Utilisation (CGU) régissent l\'utilisation de notre plateforme de location de bateaux.',
      introEn: 'These Terms and Conditions govern the use of our boat rental platform.',
      contentFr: `## 1. Objet
Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités et conditions d'utilisation de la plateforme BB YACHTS, ainsi que les droits et obligations des parties dans ce cadre.

## 2. Éditeur du site
Le site est édité par BB YACHTS, société spécialisée dans la location de yachts et d'expériences en mer.

**Adresse :** Port Camille Rayon – Avenue des frères Roustan – 06220 Vallauris, France
**Email :** charter@bb-yachts.com
**Téléphone :** 06 09 17 62 82

## 3. Hébergement
Le site est hébergé par [nom de l'hébergeur].

## 4. Propriété intellectuelle
L'ensemble des éléments du site (textes, images, logos, etc.) sont la propriété exclusive de BB YACHTS et sont protégés par les lois françaises et internationales relatives à la propriété intellectuelle.

## 5. Protection des données personnelles
Conformément à la réglementation en vigueur, notamment le Règlement Général sur la Protection des Données (RGPD), les données personnelles collectées sont traitées conformément à notre politique de confidentialité.

## 6. Responsabilité
BB YACHTS s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le site. Cependant, BB YACHTS ne peut être tenue responsable des dommages directs ou indirects résultant de l'utilisation du site.

## 7. Liens hypertextes
Le site peut contenir des liens vers d'autres sites. BB YACHTS n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.`,
      contentEn: `## 1. Object
These Terms and Conditions (T&C) define the terms and conditions of use of the BB YACHTS platform, as well as the rights and obligations of the parties.

## 2. Site Publisher
The site is published by BB YACHTS, a company specialized in yacht rentals and sea experiences.

**Address:** Port Camille Rayon – Avenue des frères Roustan – 06220 Vallauris, France
**Email:** charter@bb-yachts.com
**Phone:** 06 09 17 62 82

## 3. Hosting
The site is hosted by [host name].

## 4. Intellectual Property
All elements of the site (texts, images, logos, etc.) are the exclusive property of BB YACHTS and are protected by French and international laws relating to intellectual property.

## 5. Personal Data Protection
In accordance with applicable regulations, including the General Data Protection Regulation (GDPR), personal data collected is processed in accordance with our privacy policy.

## 6. Liability
BB YACHTS strives to ensure the accuracy and updating of information published on the site. However, BB YACHTS cannot be held responsible for direct or indirect damages resulting from the use of the site.

## 7. Hyperlinks
The site may contain links to other sites. BB YACHTS exercises no control over these sites and disclaims any responsibility for their content.`,
    },
  });

  // Page Confidentialité (Privacy)
  const privacyPage = await (prisma as any).legalPage.upsert({
    where: { slug: 'privacy' },
    update: {},
    create: {
      slug: 'privacy',
      titleFr: 'Politique de confidentialité',
      titleEn: 'Privacy Policy',
      introFr: 'BB YACHTS s\'engage à protéger la confidentialité de vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).',
      introEn: 'BB YACHTS is committed to protecting the confidentiality of your personal data in accordance with the General Data Protection Regulation (GDPR).',
      contentFr: `## 1. Collecte des données
Nous collectons les données personnelles suivantes :
- Nom et prénom
- Adresse email
- Numéro de téléphone
- Adresse postale (si nécessaire)
- Informations de paiement (traitées de manière sécurisée)

## 2. Utilisation des données
Les données collectées sont utilisées pour :
- Traiter vos réservations
- Vous contacter concernant vos demandes
- Améliorer nos services
- Vous envoyer des informations commerciales (avec votre consentement)

## 3. Conservation des données
Vos données personnelles sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées, conformément aux obligations légales.

## 4. Partage des données
Nous ne vendons ni ne louons vos données personnelles à des tiers. Vos données peuvent être partagées uniquement avec :
- Nos prestataires de services (hébergement, paiement) dans le cadre strict de leurs missions
- Les autorités compétentes si la loi l'exige

## 5. Vos droits
Conformément au RGPD, vous disposez des droits suivants :
- Droit d'accès à vos données
- Droit de rectification
- Droit à l'effacement
- Droit à la limitation du traitement
- Droit à la portabilité des données
- Droit d'opposition

Pour exercer ces droits, contactez-nous à : charter@bb-yachts.com

## 6. Cookies
Notre site utilise des cookies pour améliorer votre expérience de navigation. Vous pouvez configurer votre navigateur pour refuser les cookies.

## 7. Sécurité
Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles contre tout accès non autorisé, perte ou destruction.`,
      contentEn: `## 1. Data Collection
We collect the following personal data:
- First and last name
- Email address
- Phone number
- Postal address (if necessary)
- Payment information (processed securely)

## 2. Use of Data
The data collected is used to:
- Process your bookings
- Contact you regarding your requests
- Improve our services
- Send you commercial information (with your consent)

## 3. Data Retention
Your personal data is retained for the duration necessary for the purposes for which it was collected, in accordance with legal obligations.

## 4. Data Sharing
We do not sell or rent your personal data to third parties. Your data may be shared only with:
- Our service providers (hosting, payment) strictly within the framework of their missions
- Competent authorities if required by law

## 5. Your Rights
In accordance with the GDPR, you have the following rights:
- Right of access to your data
- Right to rectification
- Right to erasure
- Right to restriction of processing
- Right to data portability
- Right to object

To exercise these rights, contact us at: charter@bb-yachts.com

## 6. Cookies
Our site uses cookies to improve your browsing experience. You can configure your browser to refuse cookies.

## 7. Security
We implement appropriate technical and organizational measures to protect your personal data against any unauthorized access, loss or destruction.`,
    },
  });

  // Mise à jour des settings pour associer les slugs
  await (prisma as any).settings.upsert({
    where: { id: 1 },
    update: {
      legalTermsSlug: 'terms',
      legalPrivacySlug: 'privacy',
    },
    create: {
      id: 1,
      legalTermsSlug: 'terms',
      legalPrivacySlug: 'privacy',
    },
  });

  console.log('✅ Pages légales créées avec succès !');
  console.log('- CGU / Mentions:', termsPage.slug);
  console.log('- Confidentialité:', privacyPage.slug);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

