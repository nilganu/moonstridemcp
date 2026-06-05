/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the shared workspace package (ships as TS-built ESM).
  transpilePackages: ["@moonstride/api-client"],
  eslint: { ignoreDuringBuilds: true },
  // Hide the Next.js dev-mode indicator (the floating "N" badge).
  devIndicators: false,
};

export default nextConfig;
