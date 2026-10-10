import {useEffect, useState} from 'react';
import {BookOpen, ChevronDown, LogOut, Pencil, UserRound} from 'lucide-react';
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator} from '@/components/ui/dropdown-menu';
import type {User} from './types';

export function Avatar({user}: {user: User}) {
  const initials = user.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
  return <span className="user-avatar" aria-hidden="true">{initials || <UserRound size={22}/>}</span>;
}

export function AccountMenu({user}: {user: User}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/logout', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
      const data = await response.json();
      if (!response.ok || data.success !== true) throw new Error('Could not log out. Please try again.');
      location.replace('/');
    } catch { setError('Could not log out. Please try again.'); setBusy(false); }
  }
  return <DropdownMenu open={open} onOpenChange={value => {if (!busy) setOpen(value);}}>
    <DropdownMenuTrigger asChild><button className="avatar-control" aria-label={'Account menu for ' + user.name}><Avatar user={user}/><ChevronDown size={14} aria-hidden="true"/></button></DropdownMenuTrigger>
    <DropdownMenuContent className="account-menu" align="end" sideOffset={12} collisionPadding={12}>
      <div className="account-identity"><Avatar user={user}/><div><strong>{user.name}</strong><span>{user.email || 'CodeGrove learner'}</span></div></div>
      <DropdownMenuSeparator/>
      <DropdownMenuItem asChild><a href="/profile"><UserRound/>My Profile</a></DropdownMenuItem>
      <DropdownMenuItem asChild><a href="/my-courses"><BookOpen/>My Courses</a></DropdownMenuItem>
      <DropdownMenuItem asChild><a href="/profile/edit"><Pencil/>Edit Profile</a></DropdownMenuItem>
      <DropdownMenuSeparator/>
      <DropdownMenuItem disabled={busy} onSelect={event => {event.preventDefault(); void logout();}}><LogOut/>{busy ? 'Logging out…' : 'Logout'}</DropdownMenuItem>
      {error && <p className="account-error" role="alert">{error}</p>}
    </DropdownMenuContent>
  </DropdownMenu>;
}

type Profile = User & {createdAt: string; providers: string[]};
export function ProfilePage({user, edit, onUserChange}: {user: User; edit: boolean; onUserChange?: (user: User) => void}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  async function load() {
    setError('');
    try {
      const response = await fetch('/api/profile');
      if (response.status === 401) {location.replace('/signin?return_to=' + encodeURIComponent(location.pathname)); return;}
      if (!response.ok) throw new Error();
      const data = await response.json(); setProfile(data.profile); setName(data.profile.name);
    } catch {setError('Your profile could not be loaded. Please try again.');}
  }
  useEffect(() => {void load();}, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try {
      const response = await fetch('/api/profile', {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name})});
      if (response.status === 401) {location.replace('/signin?return_to=%2Fprofile%2Fedit'); return;}
      if (!response.ok) {
        setError(response.status === 400 ? 'Enter a name of 1–100 characters, without control characters.' : 'Your changes could not be saved. Please try again.');
        return;
      }
      const data = await response.json();
      setProfile(previous => previous ? {...previous, ...data.user} : previous);
      setName(data.user.name); onUserChange?.(data.user); setSaved(true);
    } catch {setError('Your changes could not be saved. Check your connection and try again.');}
    finally {setBusy(false);}
  }
  return <main className="container inner profile-page">
    <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/dashboard">My learning</a><span>/</span>{edit ? <><a href="/profile">My Profile</a><span>/</span></> : null}<span>{edit ? 'Edit Profile' : 'My Profile'}</span></nav>
    <div className="page-heading"><span className="eyebrow green-text">YOUR CODEGROVE ACCOUNT</span><h1>{edit ? 'Edit Profile' : 'My Profile'}</h1><p>{edit ? 'Make yourself at home. Choose the name you use on CodeGrove.' : 'Your details, all in one place.'}</p></div>
    {error && <div className="profile-feedback account-error" role="alert">{error}{!profile && <button className="outline" onClick={() => void load()}>Retry loading profile</button>}</div>}
    {!profile ? !error && <p role="status">Loading your profile…</p> : <section className="panel profile-card">
      <div className="profile-identity"><Avatar user={user}/><div><h2>{user.name}</h2><p>{profile.email || 'No email address on file'}</p></div></div>
      {edit ? <form className="profile-form" onSubmit={save} aria-busy={busy}>
        <label htmlFor="profile-name">Your name</label><input id="profile-name" autoComplete="name" value={name} onChange={event => {setName(event.target.value); setSaved(false);}} maxLength={100} required disabled={busy}/>
        <label htmlFor="profile-email">Email address</label><input id="profile-email" value={profile.email || ''} readOnly aria-describedby="profile-email-help"/>
        <p id="profile-email-help">Your sign-in email and connected accounts are managed separately from your profile.</p>
        {saved && <p className="profile-success" role="status">Your profile has been updated.</p>}
        <div className="profile-actions"><button className="primary" disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save changes'}</button><a className="outline" href="/profile">Back to My Profile</a></div>
      </form> : <><dl className="profile-details"><div><dt>Name</dt><dd>{user.name}</dd></div><div><dt>Email address</dt><dd>{profile.email || 'Not provided'}</dd></div><div><dt>Sign-in method</dt><dd>{profile.providers.join(' and ') || 'Managed account'}</dd></div><div><dt>Member since</dt><dd>{new Intl.DateTimeFormat('en', {dateStyle: 'long'}).format(new Date(profile.createdAt))}</dd></div></dl><div className="profile-actions"><a className="primary" href="/profile/edit"><Pencil size={17}/>Edit Profile</a><a className="outline" href="/my-courses"><BookOpen size={17}/>My Courses</a>{!profile.providers.includes('Google') && <a className="text-link green-text" href="/signin?link_google=1&return_to=%2Fprofile">Link Google account</a>}</div></>}
    </section>}
  </main>;
}
