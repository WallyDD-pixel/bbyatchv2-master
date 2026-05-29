import Script from 'next/script';

interface SEOTrackingProps {
  facebookPixelId?: string | null;
  googleAnalyticsId?: string | null;
  googleTagManagerId?: string | null;
}

export default function SEOTracking({ 
  facebookPixelId, 
  googleAnalyticsId,
  googleTagManagerId: _googleTagManagerId,
}: SEOTrackingProps) {
  if (!facebookPixelId && !googleAnalyticsId) {
    return null;
  }

  return (
    <>
      {/* Facebook Pixel / Meta Pixel */}
      {facebookPixelId && (
        <>
          <Script
            id="facebook-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${facebookPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${facebookPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* Google Analytics */}
      {googleAnalyticsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
              `,
            }}
          />
        </>
      )}

    </>
  );
}

function sanitizeGtmContainerId(containerId: string): string | null {
  const id = containerId.trim();
  if (!/^GTM-[A-Z0-9]+$/i.test(id)) return null;
  return id.toUpperCase();
}

/**
 * Commentaires HTML dans le DOM (React ne les émet pas en JSX).
 * Pattern documenté pour Next.js : fermeture factice de <script>.
 */
function HtmlComment({ text }: { text: string }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: `</script><!-- ${text} --><script>` }}
    />
  );
}

/** Snippet GTM officiel Google — premier élément du <head> */
export function GoogleTagManagerHead({ containerId }: { containerId: string }) {
  const id = sanitizeGtmContainerId(containerId);
  if (!id) return null;

  const gtmInline = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');`;

  return (
    <>
      <HtmlComment text="Google Tag Manager" />
      <script dangerouslySetInnerHTML={{ __html: gtmInline }} />
      <HtmlComment text="End Google Tag Manager" />
    </>
  );
}

/** Snippet noscript officiel Google — juste après l’ouverture de <body> */
export function GoogleTagManagerNoScript({ containerId }: { containerId: string }) {
  const id = sanitizeGtmContainerId(containerId);
  if (!id) return null;

  return (
    <>
      <HtmlComment text="Google Tag Manager (noscript)" />
      <noscript
        dangerouslySetInnerHTML={{
          __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        }}
      />
      <HtmlComment text="End Google Tag Manager (noscript)" />
    </>
  );
}

// Fonction helper pour tracker les événements Facebook
export function trackFacebookEvent(eventName: string, parameters?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, parameters);
  }
}

// Fonction helper pour tracker les événements Google Analytics
export function trackGoogleEvent(eventName: string, parameters?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, parameters);
  }
}

