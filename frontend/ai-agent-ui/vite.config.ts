import { defineConfig, loadEnv, createLogger } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import AutoImport from "unplugin-auto-import/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import path from "path";

const logger = createLogger()
const warn = logger.warn.bind(logger)
logger.warn = (msg, opts) => {
  if (msg.includes('EPIPE')) return
  warn(msg, opts)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const AUTH_BACKEND = env.AUTH_BACKEND_URL || "http://localhost:8000";
  const NEGOTIATION_BACKEND =
    env.NEGOTIATION_BACKEND_URL || "http://localhost:8000";
  const INGESTION_BACKEND =
    env.INGESTION_BACKEND_URL || "http://localhost:8002";

  return {
    customLogger: logger,
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      proxy: {
        // Auth service — login only
        "/auth/login": { target: AUTH_BACKEND, changeOrigin: true },

        // Negotiation service — all remaining HTTP endpoints (including /tenants)
        "/tenants": { target: NEGOTIATION_BACKEND, changeOrigin: true },
        "/auth": { target: NEGOTIATION_BACKEND, changeOrigin: true },
        "/session": { target: NEGOTIATION_BACKEND, changeOrigin: true },
        "/threads": { target: NEGOTIATION_BACKEND, changeOrigin: true },
        "/suppliers": { target: NEGOTIATION_BACKEND, changeOrigin: true },
        "/playbooks": { target: NEGOTIATION_BACKEND, changeOrigin: true },
        "/calculum": { target: NEGOTIATION_BACKEND, changeOrigin: true },
        "/settings": { target: NEGOTIATION_BACKEND, changeOrigin: true },
        "/health": { target: NEGOTIATION_BACKEND, changeOrigin: true },
        "/ingest": { target: INGESTION_BACKEND, changeOrigin: true },
        "/ingestion-logs": { target: INGESTION_BACKEND, changeOrigin: true },
        // UUID-prefixed paths (chat, messages, summaries) + WebSocket
        "^/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/": {
          target: NEGOTIATION_BACKEND,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    plugins: [
      vue(),
      AutoImport({
        imports: ["vue", "vue-router", "pinia"],
        dts: "src/auto-imports.d.ts",
      }),
      Components({
        resolvers: [AntDesignVueResolver({ importStyle: false })],
        dts: "src/components.d.ts",
      }),
    ],
  };
});
