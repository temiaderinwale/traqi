'use client';
/* Traqi — settings */

import React, { useEffect, useRef, useState } from 'react';
import { Settings, Sun, Moon, Download, Upload, Trash2, Pencil } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { updateBundlePin, saveWorkspace } from '@/lib/firebase';
import { COLLECTIONS, DEFAULT_CONFIG, Workspace } from '@/lib/types';
import { todayStr } from '@/lib/format';
import { Modal, Field } from './ui';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ws, isOwner, save, saveConfig, saveTargets, log, showToast, fbUser } = useTraqi();
  const [editBiz, setEditBiz] = useState(false);
  const [bizName, setBizName] = useState(ws.config.bizName);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [dark, setDark] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setBizName(ws.config.bizName); setEditBiz(false); setPin(''); setPin2('');
    setDark(document.documentElement.classList.contains('dark'));
  }, [open, ws.config.bizName]);

  const setTheme = (t: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    try { localStorage.setItem('traqi_theme', t); } catch {}
    setDark(t === 'dark');
  };

  const saveBiz = () => {
    if (!bizName.trim()) { showToast('Enter a business name'); return; }
    saveConfig({ bizName: bizName.trim() });
    if (fbUser) saveWorkspace(fbUser.uid, { bizName: bizName.trim() }).catch(() => {});
    log('Updated business name', bizName.trim());
    setEditBiz(false);
    showToast('Business name updated');
  };

  const changePin = () => {
    if (!/^\d{4}$/.test(pin)) { showToast('PIN must be 4 digits'); return; }
    if (pin !== pin2) { showToast('PINs do not match'); return; }
    saveConfig({ pin });
    if (fbUser) saveWorkspace(fbUser.uid, { pin }).catch(() => {});
    updateBundlePin(ws.config.ownerName, pin);
    setPin(''); setPin2('');
    showToast('PIN updated');
  };

  const exportData = () => {
    const backup = { app: 'Traqi', version: 1, exportDate: new Date().toISOString(), bizName: ws.config.bizName, data: ws };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.download = `${(ws.config.bizName || 'Traqi').replace(/\s+/g, '_')}_Backup_${todayStr()}.json`;
    a.href = url; a.click(); URL.revokeObjectURL(url);
    showToast('Backup exported');
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Import this backup? It replaces all current data.')) { e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const b = JSON.parse(String(ev.target?.result));
        const d: Partial<Workspace> = b.data;
        if (!d) { showToast('That file is not a Traqi backup'); return; }
        COLLECTIONS.forEach(k => { if (d[k]) save(k, d[k] as any); });
        if (d.targets) saveTargets(d.targets);
        if (d.config) saveConfig({ ...DEFAULT_CONFIG, ...d.config });
        showToast('Backup restored');
        onClose();
      } catch { showToast('Could not read that file'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const clearAll = () => {
    if (!confirm('Delete ALL data permanently? This cannot be undone.')) return;
    if (!confirm('Last chance — really delete everything?')) return;
    COLLECTIONS.forEach(k => save(k, [] as any));
    saveTargets({});
    showToast('All data cleared');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" icon={Settings}
      actions={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <div style={{ display: 'grid', gap: 14 }}>
        {isOwner && (
          <div className="card card-p" style={{ background: 'var(--surface-2)' }}>
            <div className="label" style={{ marginBottom: 10 }}>Business info</div>
            {editBiz ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Business name" />
                <button className="btn btn-primary btn-sm" onClick={saveBiz}>Save</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditBiz(false)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: '.85rem', color: 'var(--text-2)' }}>
                  Business: <strong style={{ color: 'var(--text)' }}>{ws.config.bizName || 'Not set'}</strong>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditBiz(true)}><Pencil />Edit</button>
              </div>
            )}
            <div style={{ fontSize: '.85rem', color: 'var(--text-2)', marginTop: 8 }}>
              Owner: <strong style={{ color: 'var(--text)' }}>{ws.config.ownerName}</strong>
            </div>
            <div style={{ fontSize: '.85rem', color: 'var(--text-2)', marginTop: 3 }}>
              Email: <strong style={{ color: 'var(--text)' }}>{ws.config.email || '—'}</strong>
            </div>
          </div>
        )}

        {isOwner && (
          <div className="card card-p" style={{ background: 'var(--surface-2)' }}>
            <div className="label" style={{ marginBottom: 10 }}>Change PIN</div>
            <div className="form-grid">
              <Field label="New PIN"><input type="password" className="pin-input" maxLength={4} inputMode="numeric"
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></Field>
              <Field label="Confirm"><input type="password" className="pin-input" maxLength={4} inputMode="numeric"
                value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></Field>
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={changePin}>Update PIN</button>
          </div>
        )}

        <div className="card card-p" style={{ background: 'var(--surface-2)' }}>
          <div className="label" style={{ marginBottom: 10 }}>Appearance</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={'btn btn-sm ' + (dark ? 'btn-secondary' : 'btn-primary')} onClick={() => setTheme('light')}><Sun />Light</button>
            <button className={'btn btn-sm ' + (dark ? 'btn-primary' : 'btn-secondary')} onClick={() => setTheme('dark')}><Moon />Dark</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <input type="checkbox" id="soundToggle" style={{ width: 16, height: 16, accentColor: 'var(--indigo-600)' }}
              checked={!!ws.config.soundOn} onChange={e => saveConfig({ soundOn: e.target.checked })} />
            <label htmlFor="soundToggle" style={{ fontSize: '.85rem' }}>Play a sound when a sale is recorded</label>
          </div>
        </div>

        {isOwner && (
          <>
            <div className="card card-p" style={{ background: 'var(--green-50)', borderColor: 'color-mix(in srgb,var(--green-600) 25%,transparent)' }}>
              <div className="label" style={{ marginBottom: 6, color: 'var(--green-600)' }}>Backup</div>
              <p className="hint" style={{ marginBottom: 12 }}>Export saves everything as a file. Import restores it.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-success btn-sm" onClick={exportData}><Download />Export</button>
                <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}><Upload />Import</button>
                <input ref={fileRef} type="file" accept=".json" className="hide" onChange={importData} />
              </div>
            </div>
            <div className="card card-p" style={{ background: 'var(--red-50)', borderColor: 'color-mix(in srgb,var(--red-600) 25%,transparent)' }}>
              <div className="label" style={{ marginBottom: 6, color: 'var(--red-600)' }}>Danger zone</div>
              <p className="hint" style={{ marginBottom: 12 }}>Permanently delete all products, customers, sales and records.</p>
              <button className="btn btn-danger btn-sm" onClick={clearAll}><Trash2 />Delete all data</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
