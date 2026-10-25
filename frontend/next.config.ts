import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        // Quem acessar o endereço antigo da Vercel vai para o domínio novo,
        // mantendo o caminho e a query (ex.: /dashboard -> https://lemmas.com.br/dashboard).
        // O host muda, então não há loop: no domínio novo essa regra não casa.
        source: "/:path*",
        destination: "https://lemmas.com.br/:path*",
        permanent: true,
        has: [
          {
            type: "host",
            value: "lemmas-ochre.vercel.app",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_API_URL ||
      (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : null);

    if (!backendUrl) {
      return [];
    }

    return [
      {
        source: "/api/py/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.geogebra.org https://*.geogebra.org",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://www.geogebra.org https://*.geogebra.org",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https: https://fonts.gstatic.com https://cdn.jsdelivr.net https://www.geogebra.org https://*.geogebra.org",
              "connect-src 'self' https://*.supabase.co https://*.onrender.com http://127.0.0.1:8000 http://localhost:8000 https://viacep.com.br https://cdn.jsdelivr.net https://www.geogebra.org https://*.geogebra.org https://integrate.api.nvidia.com https://generativelanguage.googleapis.com",
              "frame-src 'self' https://www.geogebra.org https://*.geogebra.org https://geogebra.org",
              "worker-src 'self' blob: https://www.geogebra.org https://*.geogebra.org",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
