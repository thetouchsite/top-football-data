import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@api/sportradar-soccer"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
