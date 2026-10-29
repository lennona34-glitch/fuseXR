import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { tosecServerPlugin } from './src/server/tosec-plugin.js';

export default defineConfig({
  plugins: [
    basicSsl(),
    tosecServerPlugin()
  ],
  server: {
    host: true, // Listen on 0.0.0.0 for Quest 3 access over Wi-Fi
    port: 5173,
    https: true,
    shortcuts: false,
    watch: {
      ignored: ['**/.*/**', '**/node_modules/**', '**/dist/**']
    }
  }
});
