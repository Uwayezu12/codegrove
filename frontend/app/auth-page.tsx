import {useState, type ReactNode} from 'react';
import {Code2, Eye, EyeOff, X} from 'lucide-react';

const googleErrors: Record<string, string> = {
  unavailable: 'Google sign-in is not configured yet. Please use your email and password.',
  cancelled: 'Google sign-in was cancelled. You can try again or use your email and password.',
  expired: 'Your Google sign-in attempt expired or could not be verified. Please try again.',
  failed: 'Google sign-in could not be completed. Please try again.',
  identity: 'Google did not provide a verified email address. Please use another account.',
  account_exists: 'An account with this email already exists. Sign in with your password first, then choose Link Google account.',
  link_session: 'Please sign in again before linking your Google account.',
  linked_elsewhere: 'This Google account is already linked to another CodeGrove account.',
  already_linked: 'Your CodeGrove account already has a different Google account linked.',
  conflict: 'This account was updated during sign-in. Please try again, or sign in with your password to link Google.',
};

function GoogleIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.93A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.93V7.48H3.07A10 10 0 0 0 2 12c0 1.62.39 3.15 1.07 4.52l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z"/></svg>;
}

export default function AuthPage({mode, user, backdrop}: {mode: string; user: {name: string; email: string} | null; backdrop?: ReactNode}) {
  const signup = mode === 'register', logout = mode === 'signout-with-chatgpt';
  const query = new URLSearchParams(location.search);
  const googleError = query.get('google_error') || '';
  const wantsLink = query.get('link_google') === '1' || ['account_exists', 'link_session'].includes(googleError);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(googleErrors[googleError] || (googleError ? googleErrors.failed : ''));
  const [showPassword, setShowPassword] = useState(false);
  const raw = query.get('return_to') || '/dashboard';
  let returnTo = '/dashboard';
  try {
    const url = new URL(raw, location.origin);
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, '').toLowerCase();
    if (raw.length <= 2048 && raw.startsWith('/') && !raw.startsWith('//') && !/[\\\x00-\x20\x7f]/.test(raw) && url.origin === location.origin && !path.startsWith('/api') && !['signin', 'register', 'signout-with-chatgpt', 'signin-with-chatgpt'].some(p => path === '/'+p || path.startsWith('/'+p+'/'))) returnTo = url.pathname + url.search + url.hash;
  } catch { /* Keep the local dashboard fallback. */ }
  const authQuery = '?return_to=' + encodeURIComponent(returnTo) + (wantsLink ? '&link_google=1' : '');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/auth/' + (logout ? 'logout' : signup ? 'register' : 'login'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: form.get('name'), email: form.get('email'), password: form.get('password')})});
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Could not sign in.');
      location.assign(logout ? '/' : wantsLink ? '/signin?link_google=1&return_to=' + encodeURIComponent(returnTo) : returnTo);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  async function googleSignIn() {
    setBusy(true); setError('');
    if (!user) {
      location.assign('/api/auth/google?mode=' + (signup ? 'register' : 'signin') + '&return_to=' + encodeURIComponent(returnTo));
      return;
    }
    try {
      const r = await fetch('/api/auth/google/link', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({return_to: returnTo})});
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Could not link Google.');
      location.assign(data.url);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  const googleButton = <button type="button" className="auth-google" disabled={busy} onClick={() => void googleSignIn()}><GoogleIcon/>{user ? 'Link Google account' : 'Continue with Google'}</button>;
  const divider = <div className="auth-divider"><span>or</span></div>;
  const linking = !!user && !logout;
  return <div className="auth-page">
    {backdrop && <div className="auth-background" inert aria-hidden="true">{backdrop}</div>}
    <main className="auth-shell">
      <section className={'auth-box' + (signup ? ' auth-register' : '')} aria-labelledby="auth-title">
        <a className="auth-close" href="/" aria-label="Back to learning"><X size={21}/></a>
        {!logout && !linking ? <nav className="auth-tabs" aria-label="Authentication">
          <h1 id="auth-title"><a href={(signup ? '/register' : '/signin') + authQuery} aria-current="page">{signup ? 'Create Account' : 'Log in'}</a></h1>
          <p>{signup ? 'Already have an account?' : 'New user?'} <a href={(signup ? '/signin' : '/register') + authQuery}>{signup ? 'Log in' : 'Register Now'}</a></p>
        </nav> : <h1 id="auth-title">{logout ? 'Sign out' : 'Link your Google account'}</h1>}
        {error && <p role="alert" className="auth-error">{error}</p>}
        {linking ? <div className="auth-link-account">
          <p>Signed in as <strong>{user.email}</strong>. Link Google to sign in to this CodeGrove account with either method.</p>
          {googleButton}
          <a className="auth-text-link" href={returnTo}>Continue to learning</a>
        </div> : <>
          {!signup && !logout && <div className="auth-social-first">{googleButton}{divider}</div>}
          <form className="auth-form" onSubmit={submit} aria-busy={busy}>
            {logout ? <p>Sign out of {user?.email || 'your account'}?</p> : <>
              <label htmlFor="auth-email">Email address</label>
              <div className="auth-input"><input id="auth-email" name="email" type="email" autoComplete="email" maxLength={191} disabled={busy} required placeholder="Email address"/></div>
              <label htmlFor="auth-password">Password</label>
              <div className="auth-input"><input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} minLength={12} maxLength={128} disabled={busy} required placeholder="Enter password" aria-describedby="password-help"/><button type="button" className="auth-password-toggle" disabled={busy} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <Eye size={22}/> : <EyeOff size={22}/>}</button></div>
              {signup && <><label htmlFor="auth-name">Your name</label><div className="auth-input"><input id="auth-name" name="name" autoComplete="name" maxLength={100} disabled={busy} required placeholder="Enter your name"/></div></>}
              <p className="auth-password-help" id="password-help">Use 12–128 characters for your password.</p>
            </>}
            <button type="submit" disabled={busy} className="primary">{busy ? 'Please wait…' : logout ? 'Sign out' : signup ? 'Sign Up' : 'Sign In'}</button>
          </form>
          {signup && !logout && <div className="auth-social-last">{divider}{googleButton}</div>}
        </>}
        <a className="brand auth-brand" href="/" aria-label="CodeGrove home"><Code2 size={22}/><span>code<span>grove</span></span></a>
        {!logout && <p className="auth-note">Keep learning. Save your progress with CodeGrove.</p>}
      </section>
    </main>
  </div>;
}
