import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "tesseract.js", "@tesseract.js-data/eng"]
};

export default nextConfig;
