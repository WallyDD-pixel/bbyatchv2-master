import { getSiteLogoUrl } from "@/lib/site-logo";
import type { Locale } from "@/i18n/messages";
import HeaderBarClient from "@/components/HeaderBarClient";

export default async function HeaderBar({
  initialLocale,
}: {
  initialLocale: Locale;
}) {
  const initialLogoUrl = await getSiteLogoUrl();
  return (
    <HeaderBarClient
      initialLocale={initialLocale}
      initialLogoUrl={initialLogoUrl}
    />
  );
}
