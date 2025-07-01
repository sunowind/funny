import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cloudflare({ 
      viteEnvironment: { name: "ssr" }
    }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
  // 处理 Prisma Client 打包
  build: {
    rollupOptions: {
      external: [
        // 排除 Prisma 引擎，使用 D1 适配器
        '@prisma/client/runtime/binary',
        '@prisma/client/runtime/library',
      ],
      output: {
        // 确保 .prisma/client 被正确处理
        manualChunks(id) {
          if (id.includes('@prisma/client') || id.includes('.prisma/client')) {
            return 'prisma-client';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '.prisma/client': '@prisma/client'
    }
  }
});

