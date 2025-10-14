// Override Next.js generated PageProps that incorrectly include Promise wrappers
// This aligns with actual runtime: params and searchParams are plain objects.

declare interface PageProps {
  params?: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, string | string[] | undefined>;
}

// Fournit une version plus permissive de FirstArg utilisée par les fichiers .next/types
// (évite l'inférence incorrecte nécessitant un second argument)
type FirstArg<F> = F extends (arg: infer A, ...rest: any[]) => any ? A : any;
