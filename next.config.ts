import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1mb; raised for the Google Contacts CSV import upload.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
