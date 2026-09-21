import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const frontendRoot=fileURLToPath(new URL('.',import.meta.url));
const projectRoot=fileURLToPath(new URL('..',import.meta.url));
export default defineConfig(({mode})=>{const env=loadEnv(mode,projectRoot,'');return {
 root:frontendRoot,envDir:projectRoot,
 plugins:[react()], resolve:{alias:{'@':frontendRoot}},
 server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':{target:`http://127.0.0.1:${env.PORT||3001}`,changeOrigin:false}}},
 build:{outDir:'dist',emptyOutDir:true},
};});
