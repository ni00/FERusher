/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
