import { defineConfig } from "eslint/config";
import nextConfig from "eslint-config-next";

export default defineConfig([{ ignores: ["public/wasm/**"] }, ...nextConfig]);
