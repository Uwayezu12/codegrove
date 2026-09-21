import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',fullyParallel:false,workers:1,retries:0,timeout:60000,
 expect:{timeout:10000},reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:3101',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome']}},{name:'mobile-chromium',use:{...devices['Pixel 7']}}],
 webServer:{command:'node --env-file=.env scripts/browser-test-server.mjs',url:'http://127.0.0.1:3101/api/health',reuseExistingServer:false,timeout:120000},
});
