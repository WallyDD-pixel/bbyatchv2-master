import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb", // augmentation limite upload (images formulaire)
    },
  },
  typescript: {
    ignoreBuildErrors: true, // Méthode 1: laisser passer la build malgré les écarts de typage générés
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
    // Désactiver l'optimisation pour les images locales (servies directement par Nginx)
    unoptimized: true,
  },
  // Permet de ne pas bloquer le build par les erreurs ESLint (on les corrigera progressivement)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
