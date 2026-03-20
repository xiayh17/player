import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import tsconfigPaths from "vite-tsconfig-paths"
import monacoEditorPlugin from "vite-plugin-monaco-editor"
import { resolve } from "path"

const host = process.env.TAURI_DEV_HOST
const devHost = host || "127.0.0.1"
const aimdPackagesRoot = resolve(__dirname, "../aimd/packages")

export default defineConfig(async () => ({
  plugins: [
    vue(),
    tsconfigPaths(),
    (monacoEditorPlugin as any).default({
      languageWorkers: ["editorWorkerService", "css", "html", "json", "typescript"],
    }),
  ],
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${resolve(__dirname, "src")}/` },
      { find: /^@airalogy\/aimd-core\/types$/, replacement: resolve(aimdPackagesRoot, "aimd-core/src/types/index.ts") },
      { find: /^@airalogy\/aimd-core$/, replacement: resolve(aimdPackagesRoot, "aimd-core/src/index.ts") },
      { find: /^@airalogy\/aimd-editor\/vue$/, replacement: resolve(aimdPackagesRoot, "aimd-editor/src/vue/index.ts") },
      { find: /^@airalogy\/aimd-editor\/embedded$/, replacement: resolve(aimdPackagesRoot, "aimd-editor/src/embedded.ts") },
      { find: /^@airalogy\/aimd-editor\/wysiwyg$/, replacement: resolve(aimdPackagesRoot, "aimd-editor/src/wysiwyg.ts") },
      { find: /^@airalogy\/aimd-editor\/monaco$/, replacement: resolve(aimdPackagesRoot, "aimd-editor/src/monaco.ts") },
      { find: /^@airalogy\/aimd-editor$/, replacement: resolve(aimdPackagesRoot, "aimd-editor/src/index.ts") },
      { find: /^@airalogy\/aimd-renderer$/, replacement: resolve(aimdPackagesRoot, "aimd-renderer/src/index.ts") },
      { find: /^@airalogy\/aimd-recorder\/styles$/, replacement: resolve(aimdPackagesRoot, "aimd-recorder/src/styles/aimd.css") },
      { find: /^@airalogy\/aimd-recorder$/, replacement: resolve(aimdPackagesRoot, "aimd-recorder/src/index.ts") },
    ],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: devHost,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  optimizeDeps: {
    include: ["monaco-editor"],
  },
  build: {
    // Monaco workers and editor assets are intentionally large in this desktop bundle.
    chunkSizeWarningLimit: 7500,
  },
}))
