import {useState} from 'react';
import {ArrowLeft,Code2,Mail,LockKeyhole,UserRound} from 'lucide-react';
export default function AuthPage({mode,user}:{mode:string;user:{name:string;email:string}|null}){const signup=mode==='register',logout=mode==='signout-with-chatgpt';const [busy,setBusy]=useState(false);const [error,setError]=useState('');
const raw=new URLSearchParams(location.search).get('return_to')||'/dashboard';let returnTo='/dashboard';try{const url=new URL(raw,location.origin);if(raw.startsWith('/')&&!raw.startsWith('//')&&url.origin===location.origin&&!['/signin','/register','/signout-with-chatgpt','/signin-with-chatgpt'].includes(url.pathname))returnTo=url.pathname+url.search;}catch{}
async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const form=new FormData(e.currentTarget);try{const r=await fetch('/api/auth/'+(logout?'logout':signup?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.get('name'),email:form.get('email'),password:form.get('password')})});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not sign in.');location.assign(logout?'/':returnTo);}catch(e){setError((e as Error).message);setBusy(false);}}
return <main className="auth-shell"><section className="auth-card-wrap">
 <div className="auth-box">
  <a className="brand auth-brand" href="/" aria-label="CodeGrove home"><Code2 size={44}/><span>code<span>grove</span></span></a>
  {!logout&&<nav className="auth-tabs" aria-label="Authentication">
   <a className={!signup?'active':''} aria-current={!signup?'page':undefined} href={'/signin?return_to='+encodeURIComponent(returnTo)}>Sign In</a>
   <a className={signup?'active':''} aria-current={signup?'page':undefined} href={'/register?return_to='+encodeURIComponent(returnTo)}>Sign Up</a>
  </nav>}
  <form className="auth-form" onSubmit={submit} aria-busy={busy}>
   <h1 className={!logout?'sr-only':undefined}>{logout?'Sign out':signup?'Create your account':'Sign in to continue'}</h1>
   {logout&&<p>Sign out of {user?.email||'your account'}?</p>}
   {error&&<p role="alert" className="auth-error red-text">{error}</p>}
   {!logout&&<>
    {signup&&<label><span className="sr-only">Your name</span><span className="auth-input"><UserRound size={20} aria-hidden="true"/><input name="name" autoComplete="name" maxLength={100} disabled={busy} required placeholder="Your name"/></span></label>}
    <label><span className="sr-only">Email address</span><span className="auth-input"><Mail size={20} aria-hidden="true"/><input name="email" type="email" autoComplete="email" maxLength={191} disabled={busy} required placeholder="Email address"/></span></label>
    <label><span className="sr-only">Password</span><span className="auth-input"><LockKeyhole size={20} aria-hidden="true"/><input name="password" type="password" autoComplete={signup?'new-password':'current-password'} minLength={12} maxLength={128} disabled={busy} required placeholder="Password" aria-describedby="password-help"/></span></label>
    <p className="muted" id="password-help">Use 12–128 characters for your password.</p>
   </>}
   <button type="submit" disabled={busy} className="primary">{busy?'Please wait…':logout?'Sign out':signup?'Create account':'Sign in'}</button>
   {!logout&&<p className="auth-note">Use your CodeGrove account to save lessons, enroll in courses, and keep your learning progress.</p>}
  </form>
 </div>
 <a className="auth-back" href="/"><ArrowLeft size={16}/>Back to learning</a>
</section></main>;
}
