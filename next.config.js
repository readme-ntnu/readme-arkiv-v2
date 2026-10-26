/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9199",
        pathname: "/**",
      },
    ],
    dangerouslyAllowLocalIP: true,
    minimumCacheTTL: 2678400, // 31 days cache for image optimisations (to avoid 500 limit)
  },
  async redirects() {
    return [
      {
        source: "/edition/:id.pdf",
        destination: "/edition/:id",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
