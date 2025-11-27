export default function AboutUsSection({ settings, locale }: { settings: any, locale: 'fr'|'en' }){

  // Importation dynamique des messages
  const { messages } = require("../i18n/messages.ts");
  const msg = messages[locale];

  const aboutUsTitle = settings?.aboutUsTitle?.trim() ? settings.aboutUsTitle : msg.about_title;
  const aboutUsSubtitle = settings?.aboutUsSubtitle?.trim() ? settings.aboutUsSubtitle : msg.about_subtitle;
  const aboutUsText = settings?.aboutUsText?.trim() ? settings.aboutUsText : msg.about_body;

  return (
    <section id="about" className="w-full max-w-6xl mt-20 px-2 sm:px-4 text-left">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f1f29] via-[#143345] to-[#1d4d65] text-white p-8 sm:p-12 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{background:'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15), transparent 60%)'}} />
        <div className="relative max-w-3xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-nakilla font-bold tracking-tight">
            {aboutUsTitle}
          </h2>
          <p className="mt-4 text-sm sm:text-base md:text-lg text-white/80 leading-relaxed">
            {aboutUsSubtitle}
          </p>
          <p className="mt-5 text-xs sm:text-sm md:text-base text-white/70 whitespace-pre-line leading-relaxed">
            {aboutUsText}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-[11px] sm:text-xs">
            <span className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 font-medium">⚓ {locale==='fr'? 'Expertise locale':'Local expertise'}</span>
            <span className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 font-medium">🛥️ {locale==='fr'? 'Flotte sélectionnée':'Curated fleet'}</span>
            <span className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 font-medium">🤝 {locale==='fr'? 'Service personnalisé':'Tailored service'}</span>
            <span className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 font-medium">🌅 {locale==='fr'? 'Expériences mémorables':'Memorable moments'}</span>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 hidden md:block opacity-30 pointer-events-none">
          <div className="w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-white/10 to-white/0 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
