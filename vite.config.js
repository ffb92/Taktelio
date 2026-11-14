import {defineConfig,loadEnv} from 'vite';
import {devApi} from './scripts/dev-api.mjs';
export default defineConfig(({mode})=>{
 const env={...loadEnv(mode,process.cwd(),''),...process.env};
 // Auth and storage also read server-only variables directly from process.env.
 for(const key of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'])if(env[key])process.env[key]=env[key];
 return {
  build:{outDir:'dist/client'},
  plugins:[{name:'taktelio-local-api',configureServer(server){server.middlewares.use(devApi(env))}}],
 };
});
