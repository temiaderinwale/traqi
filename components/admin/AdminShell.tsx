'use client';
/* Traqi — admin console shell. Reuses the app's sidebar/topbar chrome, but
   navigates by module state rather than routes: /admin stays a single,
   unlinked URL that nothing else in the product points at. */

import React, { useState } from 'react';
import {
  Activity, BarChart3, Building2, ChevronDown, CreditCard, LayoutDashboard, LogOut, Mail,
  Menu, Moon, RefreshCw, Rocket, ShieldCheck, Sun, Server, Users
} from 'lucide-react';
import { useAdmin } from '@/lib/adminStore';
import { useTheme } from '@/lib/theme';
import { Mark, Wordmark } from '@/components/Brand';
import { Avatar } from '@/components/ui';
import { usePlatform } from './platform';
import { since } from './bits';

import Overview from './modules/Overview';
import Businesses from './modules/Businesses';
import Transactions from './modules/Transactions';
import Subscriptions from './modules/Subscriptions';
import People from './modules/People';
import Newsletters from './modules/Newsletters';
import PilotSignups from './modules/PilotSignups';
import AdminTeam from './modules/AdminTeam';
import AuditLog from './modules/AuditLog';
import System from './modules/System';

type ModuleKey =
  | 'overview' | 'businesses' | 'transactions' | 'subscriptions'
  | 'people' | 'pilot' | 'newsletters' | 'team' | 'audit' | 'system';

const MODULES: {
  key: ModuleKey; title: string; short: string; sub: string; icon: any; group: string;
  badge?: 'pending'; Body: React.ComponentType;
}[] = [
  { key: 'overview', title: 'Platform Overview', short: 'Overview', sub: 'Businesses, volume and money processed at a glance', icon: LayoutDashboard, group: 'Platform', Body: Overview },
  { key: 'businesses', title: 'Businesses', short: 'Business', sub: 'Every workspace on Traqi, searchable and sortable', icon: Building2, group: 'Platform', Body: Businesses },
  { key: 'transactions', title: 'Transactions & Volume', short: 'Volume', sub: 'What moves through Traqi, month by month', icon: BarChart3, group: 'Platform', Body: Transactions },
  { key: 'subscriptions', title: 'Plans & Subscriptions', short: 'Plans', sub: 'Plan mix, trials and recurring revenue', icon: CreditCard, group: 'Revenue', Body: Subscriptions },
  { key: 'people', title: 'Users & Teams', short: 'People', sub: 'Owners, assistants and the setup funnel', icon: Users, group: 'Revenue', Body: People },
  { key: 'pilot', title: 'Pilot Applications', short: 'Pilot', sub: 'Early users who applied through the pilot page', icon: Rocket, group: 'Engagement', Body: PilotSignups },
  { key: 'newsletters', title: 'Newsletters', short: 'Mail', sub: 'Compose, segment and send to business owners', icon: Mail, group: 'Engagement', Body: Newsletters },
  { key: 'team', title: 'Admin Team', short: 'Admins', sub: 'Access requests and the admin roster', icon: ShieldCheck, group: 'Console', badge: 'pending', Body: AdminTeam },
  { key: 'audit', title: 'Audit Log', short: 'Audit', sub: 'Every privileged action taken in this console', icon: Activity, group: 'Console', Body: AuditLog },
  { key: 'system', title: 'Data & System', short: 'System', sub: 'Health checks, exports and platform hygiene', icon: Server, group: 'Console', Body: System }
];
const GROUPS = ['Platform', 'Revenue', 'Engagement', 'Console'];
/* The four that earn a permanent place in the phone's bottom bar; everything
   else lives one tap away under More, exactly as the business app does it. */
const QUICK: ModuleKey[] = ['overview', 'businesses', 'audit', 'pilot'];

export default function AdminShell() {
  const { me, isSuper, pendingCount, logout } = useAdmin();
  const { metrics, loading, refresh } = usePlatform();
  const { dark, toggle } = useTheme();
  const [active, setActive] = useState<ModuleKey>('overview');
  const [drawer, setDrawer] = useState(false);

  const current = MODULES.find(m => m.key === active)!;
  const Body = current.Body;

  const NavRows = ({ onPick }: { onPick?: () => void }) => (
    <>
      {GROUPS.map(g => {
        const items = MODULES.filter(m => m.group === g);
        return (
          <div key={g}>
            <div className="nav-sec"><ChevronDown className="nav-caret" /><span>{g}</span></div>
            <div className="nav-group">
              {items.map(m => {
                const Icon = m.icon;
                const badge = m.badge === 'pending' ? pendingCount : 0;
                return (
                  <button key={m.key} className={'nav-item' + (active === m.key ? ' active' : '')}
                    style={{ width: '100%', textAlign: 'left', font: 'inherit' }}
                    onClick={() => { setActive(m.key); onPick?.(); }}>
                    <Icon className="nav-ico" />{m.title}
                    {!!badge && <span className="nav-badge amber">{badge}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <div className="app-wrap">
      <aside className="sidebar">
        <div style={{ padding: '22px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mark />
          <span style={{ minWidth: 0 }}>
            <Wordmark className="" />
            <span style={{ display: 'block', fontSize: '.68rem', color: 'var(--amber-500)', fontWeight: 700, letterSpacing: '.06em' }}>PRODUCT ADMIN</span>
          </span>
        </div>
        <nav className="sidebar-nav"><NavRows /></nav>
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 10px' }}>
            <Avatar name={me?.username || me?.email || 'A'} tone={isSuper ? 'gold' : 'indigo'} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '.84rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {me?.username || me?.email}
              </div>
              <span className="badge" style={{ fontSize: '.6rem', background: isSuper ? 'var(--amber-500)' : 'var(--indigo-600)', color: isSuper ? 'var(--amber-950)' : '#fff' }}>
                {isSuper ? 'Owner' : 'Admin'}
              </span>
            </div>
          </div>
          <div className="nav-item" onClick={logout}><LogOut className="nav-ico" />Sign Out</div>
        </div>
      </aside>

      {/* Same chrome as the business app: one gradient title on a rich band,
          the controls to its right, and — on a phone — a bottom bar with the
          module sheet nested inside it. The console used to drop a panel down
          from the topbar instead, which was the one place the two products
          did not look like the same product. */}
      <div className="main">
        <header className="topbar"><div className="topbar-inner">
          <h1 className="topbar-title font-display"><span className="grad">{current.title}</span></h1>
          <p className="hint topbar-extra" style={{ margin: 0, fontSize: '.7rem', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {current.sub}
          </p>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-slate topbar-extra" style={{ whiteSpace: 'nowrap' }}>
              {loading ? 'reading…' : metrics ? 'data ' + since(metrics.fetchedAt) : 'no data'}
            </span>
            <button className="icon-btn" onClick={refresh} aria-label="Refresh data"><RefreshCw /></button>
            <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
          </div>
        </div></header>

        <div className="content"><Body /></div>
      </div>

      <nav className="mob-nav">
        {drawer && (
          <div className="mob-drawer open">
            {GROUPS.map(g => {
              const items = MODULES.filter(m => m.group === g && !QUICK.includes(m.key));
              if (!items.length) return null;
              return (
                <div className="mob-group" key={g}>
                  <button className="mob-group-head"><ChevronDown className="caret" /><span>{g}</span></button>
                  <div className="mob-group-body">
                    {items.map(m => {
                      const Icon = m.icon;
                      const badge = m.badge === 'pending' ? pendingCount : 0;
                      return (
                        <button key={m.key} className="mob-sub"
                          onClick={() => { setActive(m.key); setDrawer(false); }}>
                          <Icon />{m.short}{!!badge && <span className="nav-badge amber" style={{ marginLeft: 4 }}>{badge}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="mob-group">
              <button className="mob-group-head"><ChevronDown className="caret" /><span>Account</span></button>
              <div className="mob-group-body">
                <button className="mob-sub" onClick={refresh}><RefreshCw />Refresh</button>
                <button className="mob-sub" onClick={toggle}>{dark ? <Sun /> : <Moon />}Theme</button>
                <button className="mob-sub" onClick={logout}><LogOut />Sign Out</button>
              </div>
            </div>
          </div>
        )}

        <div className="mob-nav-row">
          {QUICK.map(k => {
            const m = MODULES.find(x => x.key === k)!;
            const Icon = m.icon;
            return (
              <button key={k} className={'mob-item' + (active === k ? ' active' : '')}
                onClick={() => { setActive(k); setDrawer(false); }}>
                <Icon />{m.short}
              </button>
            );
          })}
          <button className="mob-item" onClick={() => setDrawer(d => !d)}>
            <Menu />More{!!pendingCount && <span className="nav-badge amber" style={{ marginLeft: 4 }}>{pendingCount}</span>}
          </button>
        </div>
      </nav>
    </div>
  );
}
