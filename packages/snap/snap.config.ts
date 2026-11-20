import { resolve } from 'path';
import type { SnapConfig } from '@metamask/snaps-cli';

const config: SnapConfig = {
  input: resolve(__dirname, 'src/index.tsx'),
  server: {
    port: 8080,
  },
  polyfills: {
    buffer: true,
  },
};

export default config;
