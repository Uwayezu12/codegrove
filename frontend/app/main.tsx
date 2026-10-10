import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import {Code2, LoaderCircle, TriangleAlert} from 'lucide-react';
import Portal from './portal';
import AuthPage from './auth-page';
import type {Catalog,User} from './types';
import './globals.css';
import {readTheme} from './learning-utils';
document.documentElement.classList.toggle('dark',readTheme());
function App(){const [data,setData]=useState<{catalog:Catalog;user:User|null}|null>(null);const [error,setError]=useState('');
const [pathname,setPathname]=useState(location.pathname);
function navigate(url:string){history.pushState(null,'',url);setPathname(location.pathname);}
useEffect(()=>{const update=()=>setPathname(location.pathname);window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update);},[]);
useEffect(()=>{if(data&&!data.user&&['/profile','/profile/edit','/my-courses'].includes(pathname))location.replace('/signin?return_to='+encodeURIComponent(pathname+location.search));},[data,pathname]);
useEffect(()=>{const refresh=()=>{void load();};window.addEventListener('pageshow',refresh);return()=>window.removeEventListener('pageshow',refresh);},[]);
async function load(){setError('');try{const responses=await Promise.all([fetch('/api/catalog'),fetch('/api/auth/me')]);const results=await Promise.all(responses.map(r=>r.json()));for(let i=0;i<responses.length;i++)if(!responses[i].ok)throw new Error(results[i].error||'Could not load CodeGrove.');setData({catalog:results[0],user:results[1].user});}catch(e){setError(e instanceof Error?e.message:'Could not connect to CodeGrove.');}}
useEffect(()=>{void load();},[]);
if(error)return <main className="container inner empty app-state"><a className="brand" href="/"><Code2/><span>code<span>grove</span></span></a><TriangleAlert size={36} className="state-icon" aria-hidden="true"/><h1>CodeGrove is temporarily unavailable</h1><p role="alert">{error}</p><button className="primary" onClick={()=>void load()}>Try again</button></main>;
if(!data)return <main className="container inner empty app-state" aria-busy="true"><a className="brand" href="/"><Code2/><span>code<span>grove</span></span></a><LoaderCircle className="loading-icon" size={32} aria-hidden="true"/><p role="status">Loading CodeGrove…</p></main>;
const path=pathname.split('/').filter(Boolean);
if(!data.user&&['/profile','/profile/edit','/my-courses'].includes(pathname))return <main className="container inner"><p role="status">Redirecting to sign in…</p></main>;
if(path.length===1&&['signin','register','signin-with-chatgpt','signout-with-chatgpt'].includes(path[0]))return <AuthPage key={path[0]} mode={path[0]} user={data.user} navigate={navigate} backdrop={<Portal path={[]} user={null} signIn="/signin" catalog={data.catalog}/>}/>;
return <Portal path={path} user={data.user} onUserChange={user=>setData({...data,user})} signIn={'/signin?return_to='+encodeURIComponent(window.location.pathname+window.location.search)} catalog={data.catalog}/>;}
createRoot(document.getElementById('root')!).render(<App/>);
