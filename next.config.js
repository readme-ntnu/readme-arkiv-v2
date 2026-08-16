/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
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
  async rewrites() {
    return [
      {
        source: "/edition/:year-:no.pdf",
        destination: editionURLPattern,
      },
      {
        source: "/edition/:year-:no",
        destination: editionURLPattern,
      },
    ];
  },
};

const editionURLPattern = `${
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
    ? "http://127.0.0.1:9199"
    : "https://storage.googleapis.com"
}/readme-arkiv.appspot.com/pdf/:year/:year-:no.pdf`;

module.exports = nextConfig;
