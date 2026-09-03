import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir imágenes de Cloudinary y Google
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
