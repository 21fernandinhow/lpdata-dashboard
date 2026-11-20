import { fileURLToPath, URL } from "node:url"
import react from "@vitejs/plugin-react"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"

const DEFAULT_API_URL = "https://api.lpdata.io"

export default defineConfig(({ command, mode }) => {
  const apiUrl = loadEnv(mode, process.cwd(), "VITE_").VITE_LPDATA_API_URL?.trim()

  if (command === "serve" && mode === "development" && !apiUrl) {
    console.warn(
      `VITE_LPDATA_API_URL não está definida. O proxy de /api vai usar ${DEFAULT_API_URL}, que é a API de produção.`,
    )
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      // Em desenvolvimento, o cliente chama /api, e o Vite repassa para a API (src/env.ts).
      // A API vê uma chamada de servidor, sem CORS, e não precisa aceitar localhost.
      proxy: {
        "/api": {
          target: apiUrl || DEFAULT_API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./vitest.setup.ts"],
      // Os testes de integração digitam como o usuário e passam de 5 s com a suíte inteira em
      // paralelo, embora levem 1 s sozinhos.
      testTimeout: 15_000,
      env: {
        VITE_LPDATA_API_URL: "https://api.test.lpdata.io",
      },
    },
  }
})
