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
  key: ModuleKey; title: string; sub: string; icon: any; group: string;
  badge?: 'pending'; Body: React.ComponentType;
}[] = [
  { key: 'overview', title: 'Platform Overview', sub: 'Businesses, volume and money processed at a glance', icon: LayoutDashboard, group: 'Platform', Body: Overview },
  { key: 'businesses', title: 'Businesses', sub: 'Every workspace on Traqi, searchable and sortable', icon: Building2, group: 'Platform', Body: Businesses },
  { key: 'transactions', title: 'Transactions & Volume', sub: 'What moves through Traqi, month by month', icon: BarChart3, group: 'Platform', Body: Transactions },
  { key: 'subscriptions', title: 'Plans & Subscriptions', sub: 'Plan mix, trials and recurring revenue', icon: CreditCard, group: 'Revenue', Body: Subscriptions },
  { key: 'people', title: 'Users & Teams', sub: 'Owners, assistants and the setup funnel', icon: Users, group: 'Revenue', Body: People },
  { key: 'pilot', title: 'Pilot Applications', sub: 'Early users who applied through the pilot page', icon: Rocket, group: 'Engagement', Body: PilotSignups },
  { key: 'newsletters', title: 'Newsletters', sub: 'Compose, segment and send to business owners', icon: Mail, group: 'Engagement', Body: Newsletters },
  { key: 'team', title: 'Admin Team', sub: 'Access requests and the admin roster', icon: ShieldCheck, group: 'Console', badge: 'pending', Body: AdminTeam },
  { key: 'audit', title: 'Audit Log', sub: 'Every privileged action taken in this console', icon: Activity, group: 'Console', Body: AuditLog },
  { key: 'system', title: 'Data & System', sub: 'Health checks, exports and platform hygiene', icon: Server, group: 'Console', Body: System }
];
const GROUPS = ['Platform', 'Revenue', 'Engagement', 'Console'];

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

      <div className="main">
        <header className="topbar"><div className="topbar-inner">
          <button className="icon-btn adm-menu" onClick={() => setDrawer(d => !d)} aria-label="Modules"><Menu /></button>
          <div style={{ minWidth: 0 }}>
            <h1 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{current.title}</h1>
            <p className="hint" style={{ margin: 0, fontSize: '.7rem' }}>{current.sub}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-slate" style={{ whiteSpace: 'nowrap' }}>
              {loading ? 'reading…' : metrics ? 'data ' + since(metrics.fetchedAt) : 'no data'}
            </span>
            <button className="icon-btn" onClick={refresh} aria-label="Refresh data"><RefreshCw /></button>
            <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
          </div>
        </div></header>

        {drawer && (
          <div className="adm-drawer"><NavRows onPick={() => setDrawer(false)} /></div>
        )}

        <div className="content"><Body /></div>
      </div>
    </div>
  );
}
