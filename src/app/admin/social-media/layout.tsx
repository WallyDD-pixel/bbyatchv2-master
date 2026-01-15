// Désactiver le pré-rendu pour cette route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SocialMediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}





