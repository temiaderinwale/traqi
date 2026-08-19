'use client';
/* Traqi — landing page tabbed product showcase */

import { useState } from 'react';
import { Cake, LayoutDashboard, MessageCircleHeart, TrendingUp } from 'lucide-react';

const TABS = [
  { id: 't1', icon: LayoutDashboard, title: 'Intuitive Dashboard', desc: 'Your day at a glance — revenue, orders, follow-ups and stock, before your first cup of tea.' },
  { id: 't2', icon: MessageCircleHeart, title: 'Smart Follow-ups', desc: 'Reorder reminders calculated from each product usage days — sent right when customers run low.' },
  { id: 't3', icon: TrendingUp, title: 'Financial Clarity', desc: 'Profit, margins and monthly targets, without the spreadsheet gymnastics.' }
];

const BEST_SELLERS = [
  { name: 'Rose Elixir', width: '86%', bar: 'bg-indigo-600', value: '₦312k' },
  { name: 'Midnight Oud', width: '61%', bar: 'bg-indigo-400', value: '₦221k' },
  { name: 'Citrus Mist', width: '38%', bar: 'bg-amber-500', value: '₦138k' }
];

const FOLLOW_UPS = [
  { initials: 'AO', name: 'Amaka Obi', detail: 'Rose Elixir · finishes in 3 days', tag: 'DUE', tone: 'bg-amber-50 text-amber-950 dark:bg-amber-500/15 dark:text-amber-400' },
  { initials: 'FS', name: 'Fatima Suleiman', detail: 'Citrus Mist · 2 days overdue', tag: 'OVERDUE', tone: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  { initials: 'CE', name: 'Chidera Eze', detail: 'Midnight Oud · finishes in 9 days', tag: 'UPCOMING', tone: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400' }
];

const PROFIT = [
  { m: 'J', h: '40%' }, { m: 'F', h: '52%' }, { m: 'M', h: '47%' }, { m: 'A', h: '64%' },
  { m: 'M', h: '71%' }, { m: 'J', h: '66%' }, { m: 'J', h: '92%', on: true }
];

const PANEL = 'rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 shadow-sm';
const CARD = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm';

export default function Showcase() {
  const [tab, setTab] = useState('t1');

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 md:py-28 grid lg:grid-cols-2 gap-12 lg:items-center">
      <div className="rv">
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-balance">
          Made for the way <span className="text-indigo-600 dark:text-indigo-400">you</span> work
        </h2>
        <div className="mt-8 grid gap-3" role="tablist" aria-label="Product highlights">
          {TABS.map(t => {
            const Icon = t.icon, on = tab === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={on} aria-controls={'panel-' + t.id}
                onClick={() => setTab(t.id)}
                className={'text-left rounded-2xl p-5 border transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 '
                  + (on ? 'bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-800/60 dark:border-slate-700' : 'border-transparent')}>
                <span className="flex items-start gap-4">
                  <Icon className={'h-6 w-6 mt-0.5 ' + (on ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400')} />
                  <span>
                    <span className={'block font-bold ' + (on ? 'text-indigo-600 dark:text-indigo-400' : '')}>{t.title}</span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400 mt-1">{t.desc}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rv rv-d1">
        {/* Dashboard */}
        <div id="panel-t1" role="tabpanel" hidden={tab !== 't1'} className={PANEL}>
          <div className="grid grid-cols-2 gap-3">
            <div className={CARD + ' p-4'}>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Today&apos;s Schedule</p>
              <p className="tnum font-display font-extrabold text-2xl mt-1">6</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Follow-ups</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><span className="block h-full w-[78%] bg-indigo-500 rounded-full" /></div>
            </div>
            <div className={CARD + ' p-4'}>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Retention · 90 days</p>
              <p className="tnum font-display font-extrabold text-2xl mt-1">64%</p>
              <p className="text-[11px] text-green-600 font-semibold">▲ 6% this month</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><span className="block h-full w-[64%] bg-indigo-400 rounded-full" /></div>
            </div>
            <div className={'col-span-2 p-4 ' + CARD}>
              <p className="text-xs font-semibold">Best sellers this month</p>
              <div className="mt-3 space-y-2.5">
                {BEST_SELLERS.map(b => (
                  <div key={b.name} className="flex items-center gap-3">
                    <span className="text-[11px] w-24 text-slate-500 dark:text-slate-400 truncate">{b.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <span className={'block h-full rounded-full ' + b.bar} style={{ width: b.width }} />
                    </div>
                    <span className="text-[11px] tnum font-semibold">{b.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Follow-ups */}
        <div id="panel-t2" role="tabpanel" hidden={tab !== 't2'} className={PANEL}>
          <div className="space-y-3">
            {FOLLOW_UPS.map(f => (
              <div key={f.initials} className={CARD + ' p-4 flex items-center justify-between gap-3'}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-9 w-9 rounded-full bg-indigo-950 text-indigo-300 grid place-items-center text-xs font-bold shrink-0">{f.initials}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{f.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{f.detail}</p>
                  </div>
                </div>
                <span className={'text-[10px] font-bold rounded-full px-2.5 py-1 shrink-0 ' + f.tone}>{f.tag}</span>
              </div>
            ))}
            <div className="rounded-2xl bg-indigo-950 text-white p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Cake className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">Ngozi Adeyemi 🎉</p>
                  <p className="text-[11px] text-indigo-300">Birthday today — send a wish</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold bg-white/10 rounded-full px-3 py-1.5">Wish</span>
            </div>
          </div>
        </div>

        {/* Financials */}
        <div id="panel-t3" role="tabpanel" hidden={tab !== 't3'} className={PANEL}>
          <div className={CARD + ' p-5'}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Net profit · 2026</p>
              <span className="text-xs tnum font-bold text-green-600">+₦1.82M</span>
            </div>
            <div className="chart mt-4" style={{ height: 110 }} aria-hidden="true">
              {PROFIT.map((p, i) => (
                <div key={i} className="col">
                  <div className={'bar' + (p.on ? '' : ' muted')} style={{ height: p.h }} />
                  <span className={'text-[9px] ' + (p.on ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400')}>{p.m}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 py-2.5"><p className="text-[10px] text-slate-500 dark:text-slate-400">Revenue</p><p className="tnum text-sm font-bold">₦4.29M</p></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 py-2.5"><p className="text-[10px] text-slate-500 dark:text-slate-400">Expenses</p><p className="tnum text-sm font-bold text-red-600">₦1.14M</p></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 py-2.5"><p className="text-[10px] text-slate-500 dark:text-slate-400">Margin</p><p className="tnum text-sm font-bold text-green-600">43%</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
