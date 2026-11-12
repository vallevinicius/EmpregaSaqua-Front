import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * Em dev, o front fala com o back via proxy same-origin (/api, /uploads, /socket.io).
 * Isso evita depender do CORS '*' atual do back e simula o reverse proxy de produção.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.BACKEND_URL || 'http://localhost:3009';

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      strictPort: true,
      // Domínios de túnel (ngrok) para mostrar o site fora da rede local. O Vite recusa Host desconhecido;
      // o ponto inicial libera os subdomínios. Só vale em dev/preview, não afeta o build de produção.
      allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io'],
      proxy: {
        '/api': { target, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
        '/uploads': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true },
      },
    },
    // Mesmos headers de produção no `vite preview` (em dev o HMR precisa de inline/eval, então CSP só aqui).
    // vlibras.gov.br e style 'unsafe-inline': o menu de acessibilidade (Libras/Sienna) carrega o VLibras de lá e injeta estilos.
    preview: {
      headers: {
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://vlibras.gov.br; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://vlibras.gov.br; font-src 'self' data: https://vlibras.gov.br; media-src 'self' blob: https://vlibras.gov.br; worker-src 'self' blob:; connect-src 'self' ws: wss: https://vlibras.gov.br; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      proxy: {
        '/api': { target, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
        '/uploads': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true },
      },
    },
    build: {
      sourcemap: false,
      target: 'es2022',
      // Fontes nunca viram data: URI — a CSP de produção só permite font-src 'self'.
      assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
    },
    test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
  };
});
