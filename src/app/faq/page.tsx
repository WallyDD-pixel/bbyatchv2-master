import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';

export const dynamic = 'force-dynamic';

export default async function FAQPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  // Next.js 15: searchParams is a Promise
  const sp = searchParams ? await searchParams : {};
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
              href='https://wa.me/33609176282'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] text-white hover:bg-[#20BA5A] transition-colors duration-200'
              aria-label='WhatsApp'
              title={locale === 'fr' ? 'Contacter via WhatsApp' : 'Contact via WhatsApp'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}

