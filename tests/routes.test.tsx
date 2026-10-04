import React from 'react';
// tsx's Node SSR harness uses the classic JSX transform; Vite uses the automatic transform.
Object.assign(globalThis,{React});
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import Portal from '../frontend/app/portal';
import AuthPage from '../frontend/app/auth-page';
import {topics,lessons,courses,problems,questions} from '../frontend/app/data';
import {readTheme,searchCatalog} from '../frontend/app/learning-utils';
const catalog={topics,lessons,courses,problems,questions};
const routes=['/','/tutorials','/courses','/practice','/interview','/dashboard','/search','/quiz','/compiler',...topics.map(t=>'/tutorials/'+t.id),...lessons.map(l=>'/tutorial/'+l.id),...courses.map(c=>'/courses/'+c.id),...problems.map(p=>'/practice/'+p.id)];
const auth=['/signin','/register','/signin-with-chatgpt','/signout-with-chatgpt'];
function render(path:string){return renderToStaticMarkup(<Portal path={path.split('/').filter(Boolean)} user={null} signIn="/signin" catalog={catalog}/>);}
test('49 catalog and frontend routes render; every rendered anchor resolves',()=>{
 assert.equal(routes.length,49);let anchors=0;
 for(const route of routes){const html=render(route);assert(!html.includes('Page not found'),route);assert(html.includes('<main'),route);
  for(const match of html.matchAll(/href="([^"]*)"/g)){anchors++;const href=match[1];assert(href&&href!=='#'&&!href.startsWith('javascript:'),route+' '+href);if(href==='#content'){assert(html.includes('id="content"'));continue;}const pathname=new URL(href,'http://localhost').pathname;assert([...routes,...auth].includes(pathname),route+' -> '+href);}
 }
 assert(anchors>500);console.log(`Checked ${routes.length} routes and ${anchors} rendered anchors.`);
});
test('unknown topics, content and extra path segments show the not-found page',()=>{for(const p of ['/unknown','/tutorials/absent','/tutorial/absent','/courses/absent','/practice/absent','/compiler/extra','/tutorial/arrays/extra'])assert(render(p).includes('Page not found'),p);});
test('visible source has no dead hrefs, empty handlers or TODO functionality',()=>{for(const file of ['frontend/app/portal.tsx','frontend/app/main.tsx','frontend/app/auth-page.tsx']){const s=readFileSync(file,'utf8');assert(!/href\s*=\s*["'](?:#|)["']|javascript:\s*void\s*\(0\)|onClick\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}|TODO|FIXME/.test(s),file);}});
test('search supports topic titles, mixed case, multiple words and empty results',()=>{assert(searchCatalog(catalog,' DATA structures ').lessons.length>0);assert(searchCatalog(catalog,'array').problems.length>0);assert.equal(searchCatalog(catalog,'no-such-codegrove-content').lessons.length,0);assert.equal(searchCatalog(catalog,'').lessons.length,20);assert.equal(readTheme(),false);});

test('auth navigation keeps distinct tabs and preserves safe learning return paths',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'location');
 try {
  for(const mode of ['signin','register','signin-with-chatgpt']){
   Object.defineProperty(globalThis,'location',{configurable:true,value:new URL('https://codegrove.test/'+mode+'?return_to=%2Ftutorial%2Farrays')});
   const html=renderToStaticMarkup(<AuthPage mode={mode} user={null}/>);
   const tabs=html.match(/<nav[^>]*aria-label="Authentication"[^>]*>(.*?)<\/nav>/)?.[1]||'';
   assert.match(tabs,/>Sign In<\/a>/);
   assert.match(tabs,/>Sign Up<\/a>/);
   assert.match(tabs,/href="\/signin\?return_to=%2Ftutorial%2Farrays"/);
   assert.match(tabs,/href="\/register\?return_to=%2Ftutorial%2Farrays"/);
   assert.equal((tabs.match(/aria-current="page"/g)||[]).length,1);
   assert.match(html,/name="email"/);assert.match(html,/name="password"/);
   assert.equal(html.includes('name="name"'),mode==='register');
  }
  for(const unsafe of ['https://elsewhere.test/path','//elsewhere.test/path','/\\elsewhere.test','/signin','/register?return_to=/signin']){
   Object.defineProperty(globalThis,'location',{configurable:true,value:new URL('https://codegrove.test/signin?return_to='+encodeURIComponent(unsafe))});
   const html=renderToStaticMarkup(<AuthPage mode="signin" user={null}/>);
   assert.match(html,/href="\/register\?return_to=%2Fdashboard"/);
  }
  Object.defineProperty(globalThis,'location',{configurable:true,value:new URL('https://codegrove.test/signout-with-chatgpt')});
  const logout=renderToStaticMarkup(<AuthPage mode="signout-with-chatgpt" user={{name:'Learner',email:'learner@example.test'}}/>);
  assert.match(logout,/Sign out of/);assert.match(logout,/learner@example.test/);
  assert(!logout.includes('name="password"'));
 } finally {if(previous)Object.defineProperty(globalThis,'location',previous);else Reflect.deleteProperty(globalThis,'location');}
});

test('topic collections retain authored material and lesson actions remain reachable',()=>{
 for(const topic of topics){
  const html=render('/tutorials/'+topic.id);
  for(const lesson of lessons.filter(l=>l.topic===topic.id)){
   assert(html.includes('href="/tutorial/'+lesson.id+'"'));
   // React escapes content, so compare with the same serializer.
   assert(html.includes(renderToStaticMarkup(<p>{lesson.intro}</p>)));
  }
 }
 const article=render('/tutorial/arrays');
 assert.match(article,/Save lesson/);assert.match(article,/Mark as completed/);
 assert.match(article,/aria-label="Topic lessons"/);
 assert.match(article,/href="\/courses\/dsa-foundations"/);
 const practice=render('/practice');
 for(const label of ['Search problems','Filter topic','Filter difficulty','Filter solved status'])assert(practice.includes('aria-label="'+label+'"'));
});
