import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { hostname: 'img.youtube.com' },
      { hostname: 'res.cloudinary.com' },
    ],
  },
};

export default nextConfig;
