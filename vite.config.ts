import { defineConfig, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleDemoRequest } from "./server/index";

function localDemoApi(): Plugin {
  const mount = (middlewares: Connect.Server) => {
    middlewares.use((request, response, next) => {
      if (!request.url?.startsWith("/api/")) return next();
      void handleDemoRequest(request, response).catch(next);
    });
  };

  return {
    name: "local-demo-api",
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  };
}

export default defineConfig({
  plugins: [react(), localDemoApi()],
  server: {
    port: 4173,
  },
  preview: {
    port: 4173,
  },
});
