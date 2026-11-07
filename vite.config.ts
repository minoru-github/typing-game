import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// JS と CSS を index.html に埋め込み、ダブルクリック (file://) でも開けるようにする
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
});
