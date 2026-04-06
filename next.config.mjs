/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dominios permitidos para <img> y next/image
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "api.fleetyards.net" },
      { protocol: "https", hostname: "robertsspaceindustries.com" },
      { protocol: "https", hostname: "media.robertsspaceindustries.com" },
      { protocol: "https", hostname: "cdn.robertsspaceindustries.com" },
      { protocol: "https", hostname: "fleetyards.s3.amazonaws.com" },
    ],
    unoptimized: true,
  },

  // Variables de entorno públicas disponibles en el cliente
  env: {
    NEXT_PUBLIC_APP_NAME: "Outlaws Syndicate",
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
