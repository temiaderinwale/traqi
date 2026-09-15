'use client';
/* Traqi — application shell (sidebar, topbar, mobile nav, gates) */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, ArrowLeft, BarChart3, Bell, BellRing, Boxes, ChevronDown, Hourglass, LayoutDashboard,
  ListChecks, Lock, LogOut, Menu, MessagesSquare, MessageSquareText, Moon, Package, Plus, Receipt,
  Repeat, RotateCcw, Settings, ShieldCheck, Sun, Truck, UserCog, Users, Wallet
} from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { pendingTaskCount, unreadMsgCount } from '@/lib/compute';
import { fireFab } from '@/lib/fab';
import type { FeatureKey } from '@/lib/tiers';
import { Mark, Wordmark } from './Brand';
import Preloader from './Preloader';
import { Field, Avatar } from './ui';
import SettingsModal from './SettingsModal';

export type NavItem = {
  key: string; href: string; title: string; icon: any;
  group: string; perm?: string; owner?: boolean; badge?: 'tasks' | 'messages' | 'approvals';
  /* Locked away unless the workspace's tier includes it. */
  feature?: FeatureKey;
  /* What the mobile "+" does on this page (the page handles it via useFabAction).
     Pages without one — or whose add the user may not use — fall back to a new sale. */
  fab?: { label: string; perm?: string; owner?: boolean };
};

export const NAV: NavItem[] = [
  { key: 'home', href: '/dashboard', title: 'Daily Briefing', icon: LayoutDashboard, group: 'Overview' },
  { key: 'products', href: '/products', title: 'Products', icon: Package, group: 'Sales', perm: 'view_products', fab: { label: 'Add product', perm: 'add_products' } },
  { key: 'sales', href: '/sales', title: 'Sales Log', icon: Receipt, group: 'Sales', perm: 'record_sales', fab: { label: 'Record sale', perm: 'record_sales' } },
  { key: 'returns', href: '/returns', title: 'Returns & Refunds', icon: RotateCcw, group: 'Sales', perm: 'log_returns', fab: { label: 'Log return', perm: 'log_returns' } },
  { key: 'financials', href: '/financials', title: 'Financial Report', icon: BarChart3, group: 'Finance & Ops', perm: 'view_financials', feature: 'financials' },
  { key: 'inventory', href: '/inventory', title: 'Inventory', icon: Boxes, group: 'Finance & Ops', perm: 'view_inventory', fab: { label: 'Restock', perm: 'restock' } },
  { key: 'suppliers', href: '/suppliers', title: 'Suppliers', icon: Truck, group: 'Finance & Ops', perm: 'view_suppliers', fab: { label: 'Add supplier' } },
  { key: 'expenses', href: '/expenses', title: 'Expenses', icon: Wallet, group: 'Finance & Ops', perm: 'view_expenses', fab: { label: 'Add expense', perm: 'add_expenses' } },
  { key: 'debts', href: '/debts', title: 'Debts & Credit', icon: Hourglass, group: 'Finance & Ops', perm: 'view_debts', fab: { label: 'Add debt' } },
  { key: 'customers', href: '/customers', title: 'Customers', icon: Users, group: 'Customers', perm: 'view_customers', fab: { label: 'Add customer', perm: 'add_customers' } },
  { key: 'followups', href: '/followups', title: 'Follow-Up Tracker', icon: BellRing, group: 'Customers', perm: 'view_followups', feature: 'followups' },
  { key: 'templates', href: '/templates', title: 'WhatsApp Templates', icon: MessageSquareText, group: 'Customers', perm: 'use_templates' },
  { key: 'team', href: '/team', title: 'Team', icon: UserCog, group: 'Management', owner: true, feature: 'team', fab: { label: 'Register assistant', owner: true } },
  { key: 'tasks', href: '/tasks', title: 'Tasks', icon: ListChecks, group: 'Management', badge: 'tasks', feature: 'tasks', fab: { label: 'Assign task', owner: true } },
  { key: 'approvals', href: '/approvals', title: 'Approvals', icon: ShieldCheck, group: 'Management', owner: true, badge: 'approvals', feature: 'team' },
  { key: 'messages', href: '/messages', title: 'Messages', icon: MessagesSquare, group: 'Management', badge: 'messages', feature: 'team', fab: { label: 'New message' } },
  { key: 'activity', href: '/activity', title: 'Activity Log', icon: Activity, group: 'Management', owner: true, feature: 'team' }
];
const GROUPS = ['Overview', 'Sales', 'Finance & Ops', 'Customers', 'Management'];

export { Mark, Wordmark } from './Brand';


/* ---------- Role / PIN gate ---------- */
function RoleGate() {
  const { roleCandidates, chooseRole } = useTraqi();
  const roles = roleCandidates();
  const [picked, setPicked] = useState(roles[0]?.id || 'owner');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    if (pin.length !== 4) { setErr('Enter a 4-digit PIN'); return; }
    const msg = chooseRole(picked, pin);
    setErr(msg);
  };
  return (
    <div className="full-overlay open">
      <div className="modal narrow">
        <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px' }}>Who&apos;s working?</h3>
        <p className="hint" style={{ marginBottom: 20 }}>Choose the owner or an assistant, then enter the 4-digit PIN.</p>
        {roles.map(r => (
          <button key={r.id} className={'role-item' + (picked === r.id ? ' active' : '')} onClick={() => { setPicked(r.id); setPin(''); setErr(''); }}>
            <Avatar name={r.name} tone={r.type === 'owner' ? 'gold' : 'indigo'} />
            <span><strong>{r.name}</strong><span className="rm">{r.type === 'owner' ? 'Owner · full access' : 'Assistant'}</span></span>
          </button>
        ))}
        <Field label="PIN">
          <input type="password" className="pin-input" maxLength={4} inputMode="numeric" placeholder="••••"
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
        </Field>
        {err && <div className="msg err">{err}</div>}
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={submit}>Continue</button>
      </div>
    </div>
  );
}

/* ---------- Session lock ---------- */
function useIdleLock(enabled: boolean) {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let t: number;
    const reset = () => { window.clearTimeout(t); t = window.setTimeout(() => setLocked(true), 30 * 60 * 1000); };
    ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(e => document.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(t);
      ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(e => document.removeEventListener(e, reset));
    };
  }, [enabled]);
  return { locked, unlock: () => setLocked(false) };
}
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { ws, user, logout, linkedAssistant } = useTraqi();
  const [pin, setPin] = useState('');
  const correct = user.role === 'owner' ? ws.config.pin : ws.assistants.find(a => a.id === user.id)?.pin || '';
  const submit = () => { if (pin === correct) onUnlock(); else setPin(''); };

  /* PINs live in the owner's private document, so an assistant working from
     their own device holds none — they sign in again instead. */
  if (linkedAssistant) {
    return (
      <div className="full-overlay open">
        <div className="modal narrow" style={{ textAlign: 'center' }}>
          <span style={{ width: 56, height: 56, borderRadius: '1rem', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}><Lock /></span>
          <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px' }}>Session locked</h3>
          <p className="hint" style={{ marginBottom: 18 }}>
            Inactive for 30 minutes. Sign in again to pick up where you left off.
          </p>
          <button className="btn btn-primary btn-block" onClick={logout}>Sign in again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="full-overlay open">
      <div className="modal narrow" style={{ textAlign: 'center' }}>
        <span style={{ width: 56, height: 56, borderRadius: '1rem', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}><Lock /></span>
        <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px' }}>Session locked</h3>
        <p className="hint" style={{ marginBottom: 18 }}>Inactive for 30 minutes. Enter your PIN to continue.</p>
        <input type="password" className="pin-input" maxLength={4} inputMode="numeric" placeholder="••••" autoFocus
          value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={e => e.key === 'Enter' && submit()} />
        <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={submit}>Unlock</button>
        <p className="hint" style={{ marginTop: 12 }}><button className="link-btn" onClick={logout}>Switch user</button></p>
      </div>
    </div>
  );
}

/* ---------- Shell ---------- */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const {
    ws, user, stage, can, isOwner, hasFeature, tier, currency, setCurrency,
    toast, switchRole, logout, linkedAssistant
  } = useTraqi();
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const [settings, setSettings] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(GROUPS);
  const { locked, unlock } = useIdleLock(stage === 'ready');

  /* Signed out, or caught mid-flow (verify / complete profile / onboarding):
     those screens all live on /auth, so send the session there. */
  useEffect(() => {
    if (stage !== 'ready' && stage !== 'pin' && stage !== 'loading') router.replace('/auth');
  }, [stage, router]);

  const current = NAV.find(n => n.href === pathname);
  const visible = (n: NavItem) =>
    (n.feature ? hasFeature(n.feature) : true) && (n.owner ? isOwner : n.perm ? can(n.perm) : true);
  const badgeCount = (n: NavItem) =>
    n.badge === 'tasks' ? pendingTaskCount(ws, user)
      : n.badge === 'messages' ? unreadMsgCount(ws, user)
        : n.badge === 'approvals' ? ws.pending.filter(p => p.status === 'pending').length : 0;

  /* Guard: redirect if this route is off-limits for the role or the tier —
     typing the URL is not a way around either. */
  useEffect(() => {
    if (stage !== 'ready' || !current) return;
    if ((current.feature && !hasFeature(current.feature))
      || (current.owner && !isOwner)
      || (current.perm && !can(current.perm))) router.replace('/dashboard');
  }, [stage, current, isOwner, can, hasFeature, router]);

  if (stage === 'loading') return <Preloader />;
  if (stage === 'pin') return <RoleGate />;
  /* Never render app pages without the shell around them — on the way out the
     page would otherwise flash bare and half-built. Hold the curtain until
     /auth takes over. */
  if (stage !== 'ready') return <Preloader />;

  const unread = unreadMsgCount(ws, user), tasks = pendingTaskCount(ws, user);
  const fabHere = !!current?.fab && (current.fab.owner ? isOwner : current.fab.perm ? can(current.fab.perm) : true);

  return (
    <>
      <div className="app-wrap">
        <aside className="sidebar">
          <Link href="/dashboard" style={{ padding: '22px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mark />
            <span style={{ minWidth: 0 }}>
              <Wordmark className="" />
              <span style={{ display: 'block', fontSize: '.68rem', color: 'var(--indigo-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ws.config.bizName}</span>
            </span>
          </Link>
          <nav className="sidebar-nav">
            {GROUPS.map(g => {
              const items = NAV.filter(n => n.group === g && visible(n));
              if (!items.length) return null;
              const open = openGroups.includes(g);
              return (
                <div key={g}>
                  <div className={'nav-sec' + (open ? '' : ' collapsed')}
                    onClick={() => setOpenGroups(p => open ? p.filter(x => x !== g) : [...p, g])}>
                    <ChevronDown className="nav-caret" /><span>{g}</span>
                  </div>
                  <div className={'nav-group' + (open ? '' : ' collapsed')}>
                    {items.map(n => {
                      const Icon = n.icon, count = badgeCount(n);
                      return (
                        <Link key={n.key} href={n.href} className={'nav-item' + (pathname === n.href ? ' active' : '')}>
                          <Icon className="nav-ico" />{n.title}
                          {!!count && <span className={'nav-badge' + (n.badge === 'messages' ? ' amber' : '')}>{count}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 10px' }}>
              <Avatar name={user.name} tone="indigo" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '.84rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <span className="badge" style={{ fontSize: '.6rem', background: isOwner ? 'var(--amber-500)' : 'var(--indigo-600)', color: isOwner ? 'var(--amber-950)' : '#fff' }}>
                  {isOwner ? 'Owner' : 'Assistant'}
                </span>
              </div>
            </div>
            {/* An assistant on their own account holds one seat — there is nothing to
                switch to, and offering it would imply the owner's PIN opens here. */}
            {!linkedAssistant && (
              <div className="nav-item" onClick={switchRole}><Repeat className="nav-ico" />Switch Role</div>
            )}
            <div className="nav-item" onClick={() => setSettings(true)}><Settings className="nav-ico" />Settings</div>
            <div className="nav-item" onClick={logout}><LogOut className="nav-ico" />Sign Out</div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar"><div className="topbar-inner">
            {pathname !== '/dashboard' && (
              <Link className="icon-btn topbar-back" href="/dashboard" aria-label="Dashboard"><ArrowLeft /></Link>
            )}
            <h1 className="topbar-title font-display">
              <span className="grad">{current?.title || 'Traqi'}</span>
            </h1>
            {/* On a phone the row belongs to the title, so the three controls
                that also live in Settings — currency, theme, and the date the
                dashboard already prints — stand down there. `topbar-extra`
                is what hides them. */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              {isOwner && (
                <span className={'badge topbar-tier ' + (tier.key === 'pro' ? 'badge-indigo' : tier.key === 'lite' ? 'badge-amber' : 'badge-slate')}
                  style={{ cursor: 'pointer' }} onClick={() => setSettings(true)} title="Your plan — tap to change">
                  {tier.name}
                </span>
              )}
              <span className="badge badge-indigo topbar-extra" style={{ cursor: 'pointer' }} onClick={() => setCurrency(currency === 'NGN' ? 'USD' : 'NGN')}>
                {currency === 'NGN' ? '₦ NGN' : '$ USD'}
              </span>
              <span className="badge badge-slate topbar-extra">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
              <Link className="icon-btn" href="/messages" aria-label="Messages" style={{ position: 'relative' }}>
                <Bell />
                {!!(unread || tasks) && <span style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 99, background: 'var(--amber-500)' }} />}
              </Link>
              <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Settings"><Settings /></button>
            </div>
          </div></header>
          <div className="content">{children}</div>
        </div>
      </div>

      {fabHere ? (
        <button className="fab" onClick={fireFab} aria-label={current!.fab!.label} title={current!.fab!.label}><Plus /></button>
      ) : can('record_sales') && (
        <Link className="fab" href="/sales?new=1" aria-label="Quick sale" title="Quick sale"><Plus /></Link>
      )}

      {/* The module sheet lives inside the bar rather than floating above it.
          As a sibling it was pinned at a fixed distance from the bottom, which
          only matched the bar's height at one root font size — every other
          size showed a strip of the page between the two. Nested, they are one
          block on one background and there is no seam to get wrong. */}
      <nav className="mob-nav">
        {drawer && (
          <div className="mob-drawer open">
          {GROUPS.filter(g => g !== 'Overview').map(g => {
            const items = NAV.filter(n => n.group === g && visible(n));
            if (!items.length) return null;
            return (
              <div className="mob-group" key={g}>
                <button className="mob-group-head"><ChevronDown className="caret" /><span>{g}</span></button>
                <div className="mob-group-body">
                  {items.map(n => {
                    const Icon = n.icon;
                    return <Link key={n.key} href={n.href} className="mob-sub" onClick={() => setDrawer(false)}><Icon />{n.title.split(' ')[0]}</Link>;
                  })}
                </div>
              </div>
            );
          })}
          <div className="mob-group">
            <button className="mob-group-head"><ChevronDown className="caret" /><span>Account</span></button>
            <div className="mob-group-body">
              {!linkedAssistant && <div className="mob-sub" onClick={() => { setDrawer(false); switchRole(); }}><Repeat />Switch</div>}
              <div className="mob-sub" onClick={() => { setDrawer(false); setSettings(true); }}><Settings />Settings</div>
              <div className="mob-sub" onClick={logout}><LogOut />Sign Out</div>
            </div>
          </div>
          </div>
        )}

        <div className="mob-nav-row">
          {[NAV[0], NAV.find(n => n.key === 'sales')!, NAV.find(n => n.key === 'customers')!, NAV.find(n => n.key === 'financials')!]
            .filter(visible).map(n => {
              const Icon = n.icon;
              return (
                <Link key={n.key} href={n.href} className={'mob-item' + (pathname === n.href ? ' active' : '')}>
                  <Icon />{n.key === 'home' ? 'Home' : n.key === 'financials' ? 'Reports' : n.title.split(' ')[0]}
                </Link>
              );
            })}
          <button className="mob-item" onClick={() => setDrawer(d => !d)}><Menu />More</button>
        </div>
      </nav>

      {toast && (
        <div className="toast show">
          <span>{toast.msg}</span>
          {toast.undo && <span className="toast-undo" onClick={toast.undo}>Undo</span>}
        </div>
      )}

      <SettingsModal open={settings} onClose={() => setSettings(false)} />
      {locked && <LockScreen onUnlock={unlock} />}
    </>
  );
}
