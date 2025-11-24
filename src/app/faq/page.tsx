import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';

export const dynamic = 'force-dynamic';

export default async function FAQPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const sp = searchParams || {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  const faqs = locale === 'fr' ? [
    {
      question: "Comment réserver un bateau ?",
      answer: "Vous pouvez réserver un bateau directement depuis notre site en utilisant le formulaire de recherche. Sélectionnez votre ville de départ, vos dates, le nombre de passagers et le créneau souhaité (matin, après-midi ou journée complète). Vous verrez ensuite les bateaux disponibles et pourrez procéder à la réservation en ligne."
    },
    {
      question: "Quels sont les modes de paiement acceptés ?",
      answer: "Nous acceptons les paiements par carte bancaire (Visa, Mastercard, American Express) via notre système de paiement sécurisé. Un dépôt de garantie peut être requis selon le type de location."
    },
    {
      question: "Puis-je annuler ma réservation ?",
      answer: "Oui, vous pouvez annuler votre réservation. Cependant, l'acompte versé lors de la réservation n'est pas remboursable en cas d'annulation, quelle que soit la date d'annulation. Les conditions d'annulation varient selon le type de location et le délai. Consultez notre politique d'annulation pour plus de détails."
    },
    {
      question: "Faut-il un permis bateau ?",
      answer: "Cela dépend du type de bateau et de la location. Certains bateaux nécessitent un permis bateau, d'autres peuvent être loués sans permis avec un skipper. Les informations sont indiquées sur chaque fiche bateau."
    },
    {
      question: "Que se passe-t-il en cas de mauvais temps ?",
      answer: "En cas de conditions météorologiques défavorables, nous vous contacterons pour proposer un report ou un remboursement. Votre sécurité est notre priorité."
    },
    {
      question: "Puis-je modifier ma réservation ?",
      answer: "Oui, vous pouvez modifier votre réservation en nous contactant. Les modifications sont possibles selon la disponibilité et peuvent être soumises à des conditions. Contactez-nous au plus tôt pour toute modification."
    },
    {
      question: "Qu'est-ce qui est inclus dans le prix ?",
      answer: "Le prix inclut généralement la location du bateau pour la durée choisie. Le carburant, les options supplémentaires (skipper, équipements, etc.) peuvent être facturés séparément. Les détails sont précisés sur chaque fiche de réservation."
    },
    {
      question: "Où se trouve le point de rendez-vous ?",
      answer: "Le point de rendez-vous vous sera communiqué après la confirmation de votre réservation. Il se situe généralement au port indiqué lors de votre recherche. Vous recevrez toutes les informations pratiques par email."
    }
  ] : [
    {
      question: "How do I book a boat?",
      answer: "You can book a boat directly from our website using the search form. Select your departure city, dates, number of passengers and desired time slot (morning, afternoon or full day). You will then see available boats and can proceed with online booking."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept credit card payments (Visa, Mastercard, American Express) through our secure payment system. A security deposit may be required depending on the rental type."
    },
    {
      question: "Can I cancel my reservation?",
      answer: "Yes, you can cancel your reservation. However, the deposit paid at the time of booking is non-refundable in case of cancellation, regardless of the cancellation date. Cancellation conditions vary depending on the rental type and timing. Check our cancellation policy for more details."
    },
    {
      question: "Do I need a boat license?",
      answer: "This depends on the type of boat and rental. Some boats require a boat license, others can be rented without a license with a skipper. Information is indicated on each boat listing."
    },
    {
      question: "What happens in case of bad weather?",
      answer: "In case of unfavorable weather conditions, we will contact you to offer a postponement or refund. Your safety is our priority."
    },
    {
      question: "Can I modify my reservation?",
      answer: "Yes, you can modify your reservation by contacting us. Modifications are possible depending on availability and may be subject to conditions. Contact us as soon as possible for any changes."
    },
    {
      question: "What is included in the price?",
      answer: "The price generally includes the boat rental for the chosen duration. Fuel, additional options (skipper, equipment, etc.) may be charged separately. Details are specified on each booking form."
    },
    {
      question: "Where is the meeting point?",
      answer: "The meeting point will be communicated after your booking confirmation. It is usually at the port indicated during your search. You will receive all practical information by email."
    }
  ];

  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-b from-white to-[#f3f6f9]'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-14'>
        <div className='mb-12'>
          <h1 className='text-3xl sm:text-4xl font-bold tracking-tight mb-4'>
            {locale === 'fr' ? 'Questions fréquentes' : 'Frequently Asked Questions'}
          </h1>
          <p className='text-sm sm:text-base text-black/60 max-w-2xl'>
            {locale === 'fr' 
              ? "Trouvez les réponses aux questions les plus courantes sur nos services de location de bateaux et d'expériences en mer."
              : "Find answers to the most common questions about our boat rental and sea experience services."}
          </p>
        </div>

        {/* Liste des FAQ */}
        <div className='space-y-4'>
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm hover:shadow-md transition'
            >
              <h2 className='text-lg font-semibold mb-3 text-[var(--primary)]'>
                {faq.question}
              </h2>
              <p className='text-sm text-black/70 leading-relaxed'>
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        {/* Section contact si besoin d'aide supplémentaire */}
        <div className='mt-16 bg-white rounded-2xl border border-black/10 p-8 shadow-sm'>
          <h2 className='text-2xl font-semibold mb-4'>
            {locale === 'fr' ? 'Besoin d\'aide supplémentaire ?' : 'Need additional help?'}
          </h2>
          <p className='text-sm text-black/60 mb-6 leading-relaxed'>
            {locale === 'fr' 
              ? "Si vous ne trouvez pas la réponse à votre question, n'hésitez pas à nous contacter. Notre équipe est là pour vous aider."
              : "If you can't find the answer to your question, don't hesitate to contact us. Our team is here to help you."}
          </p>
          <div className='flex flex-wrap gap-3'>
            <a 
              href={`/${locale === 'en' ? '?lang=en' : ''}#contact`}
              className='inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--primary)] text-white text-sm font-medium hover:brightness-110 transition'
            >
              <span>📧</span>
              <span>{locale === 'fr' ? 'Nous contacter' : 'Contact us'}</span>
            </a>
            <a 
              href='mailto:charter@bb-yachts.com'
              className='inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/15 bg-white text-sm font-medium hover:bg-black/5 transition'
            >
              <span>✉️</span>
              <span>charter@bb-yachts.com</span>
            </a>
            <a 
              href='tel:+33609176282'
              className='inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/15 bg-white text-sm font-medium hover:bg-black/5 transition'
            >
              <span>☎️</span>
              <span>06 09 17 62 82</span>
            </a>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}

