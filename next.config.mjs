/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Farm data reads uploaded accounts PDFs in a server action (10 MB cap there, plus multipart overhead).
    serverActions: { bodySizeLimit: "11mb" },
  },
};

export default nextConfig;
