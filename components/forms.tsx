'use client';
/* Traqi — record forms (create + edit) */

import React, { useEffect, useState } from 'react';
import {
  Package, UserPlus, Truck, Wallet, Hourglass, Eye, EyeOff, Lock, RotateCcw, Boxes, Target, ListChecks, Send, MessageSquare
} from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { nextId, todayStr } from '@/lib/format';
import { PERMISSIONS, APPROVAL_REQUIRED } from '@/lib/compute';
import { UsernameTaken, releaseUsername, reserveUsername, usernameKey } from '@/lib/usernames';
import { Modal, Field } from './ui';
import CategorySelect from './CategorySelect';
import type { Product, Customer, Supplier, Expense, Debt, Assistant } from '@/lib/types';

type FormProps<T> = { open: boolean; onClose: () => void; editing?: T | null };

/* PINs are typed fresh — password managers refill any password box on sight. */
const NO_AUTOFILL = {
  autoComplete: 'new-password',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other'
} as const;

/* ---------------- Product ---------------- */
export function ProductForm({ open, onClose, editing }: FormProps<Product>) {
  const { ws, save, log, showToast, requiresApproval, submitApproval } = useTraqi();
  const blank = { name: '', cat: '', size: '', cost: '', price: '', usageDays: '', stock: '', reorder: '', supplier: '', notes: '' };
  const [f, setF] = useState<any>(blank);
  useEffect(() => {
    setF(editing ? { ...editing, cost: String(editing.cost), price: String(editing.price), usageDays: String(editing.usageDays), stock: String(editing.stock), reorder: String(editing.reorder ?? '') } : blank);
  }, [editing, open]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = () => {
    if (!f.name || !f.cat || !f.price || f.cost === '' || !f.usageDays || f.stock === '') { showToast('Please fill the required fields'); return; }
    const rec: Product = {
      id: editing?.id || nextId('PRF', ws.products), name: f.name.trim(), cat: f.cat, size: f.size,
      cost: parseFloat(f.cost) || 0, price: parseFloat(f.price) || 0, stock: parseInt(f.stock) || 0,
      restocked: editing?.restocked || 0, reorder: parseInt(f.reorder) || 0, usageDays: parseInt(f.usageDays) || 0,
      supplier: f.supplier, notes: f.notes
    };
    const perm = editing ? 'edit_products' : 'add_products';
    if (requiresApproval(perm)) {
      submitApproval(editing ? 'edit_product' : 'add_product', rec, (editing ? 'Edit product: ' : 'Add product: ') + rec.name);
      onClose(); return;
    }
    save('products', editing ? ws.products.map(p => (p.id === rec.id ? rec : p)) : [...ws.products, rec]);
    log('Product ' + (editing ? 'updated' : 'added'), rec.name);
    showToast('Product ' + (editing ? 'updated' : 'added') + ': ' + rec.name);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Product' : 'Add Product'} icon={Package}
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Save Product</button></>}>
      <div className="form-grid">
        <Field label="Product name *" full><input value={f.name} onChange={set('name')} placeholder="e.g. Rose Elixir" /></Field>
        <Field label="Category *">
          <CategorySelect value={f.cat} onChange={cat => setF((p: any) => ({ ...p, cat }))} />
        </Field>
        <Field label="Size/Model/Colour"><input value={f.size} onChange={set('size')} placeholder="50ml" /></Field>
        <Field label="Cost price (₦) *"><input type="number" value={f.cost} onChange={set('cost')} placeholder="3500" /></Field>
        <Field label="Selling price (₦) *"><input type="number" value={f.price} onChange={set('price')} placeholder="8500" /></Field>
        <Field label="Usage days *" hint="Drives follow-up dates"><input type="number" value={f.usageDays} onChange={set('usageDays')} placeholder="30" /></Field>
        <Field label="Opening stock *"><input type="number" value={f.stock} onChange={set('stock')} placeholder="20" /></Field>
        <Field label="Reorder level"><input type="number" value={f.reorder} onChange={set('reorder')} placeholder="5" /></Field>
        <Field label="Supplier"><select value={f.supplier} onChange={set('supplier')}>
          <option value="">None</option>{ws.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></Field>
        <Field label="Notes" full><input value={f.notes} onChange={set('notes')} placeholder="Any notes…" /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Customer ---------------- */
export function CustomerForm({ open, onClose, editing }: FormProps<Customer>) {
  const { ws, save, log, showToast, tier, customerLimit, atCustomerLimit } = useTraqi();
  /* Editing an existing record is always allowed — the cap is on how many a
     plan may hold, not on keeping the ones already there accurate. */
  const blocked = !editing && atCustomerLimit;
  const blank = { name: '', phone: '', wa: '', insta: '', city: '', type: 'Regular', bday: '', source: '', refby: '', scent: '', notes: '' };
  const [f, setF] = useState<any>(blank);
  const [step, setStep] = useState(1);
  useEffect(() => { setF(editing ? { ...editing } : blank); setStep(1); }, [editing, open]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = () => {
    if (blocked) { showToast(`${tier.name} holds up to ${customerLimit} customers — upgrade in Settings`); return; }
    if (!f.name || !f.phone) { showToast('Name and phone are required'); return; }
    const rec: Customer = {
      id: editing?.id || nextId('CUS', ws.customers), name: f.name.trim(), phone: f.phone.trim(),
      wa: f.wa || f.phone, insta: f.insta, city: f.city, type: f.type, bday: f.bday,
      source: f.source, refby: f.refby, scent: f.scent, notes: f.notes
    };
    save('customers', editing ? ws.customers.map(c => (c.id === rec.id ? rec : c)) : [...ws.customers, rec]);
    log('Customer ' + (editing ? 'updated' : 'added'), rec.name);
    showToast('Customer ' + (editing ? 'updated' : 'added') + ': ' + rec.name);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Customer' : 'Add Customer'} icon={UserPlus} wide
      actions={step === 1
        ? <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={blocked} onClick={() => { if (!f.name || !f.phone) { showToast('Name and phone are required'); return; } setStep(2); }}>Next →</button></>
        : <><button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" disabled={blocked} onClick={submit}>Save Customer</button></>}>
      <div className="step-dots"><div className={'step-dot' + (step === 1 ? ' active' : '')} /><div className={'step-dot' + (step === 2 ? ' active' : '')} /></div>
      {blocked && (
        <div className="tier-lock" style={{ marginBottom: 14 }}>
          <Lock />
          <span>
            <strong>{tier.name} holds up to {customerLimit} customers</strong> and you have {ws.customers.length}.
            Change your plan in Settings to add more — nothing you have recorded is affected.
          </span>
        </div>
      )}
      {step === 1 ? (
        <div className="form-grid">
          <Field label="Full name *" full><input value={f.name} onChange={set('name')} placeholder="e.g. Amaka Obi" /></Field>
          <Field label="Phone *"><input value={f.phone} onChange={set('phone')} placeholder="0801…" /></Field>
          <Field label="WhatsApp"><input value={f.wa} onChange={set('wa')} placeholder="0801…" /></Field>
          <Field label="Instagram"><input value={f.insta} onChange={set('insta')} placeholder="@username" /></Field>
          <Field label="City"><input value={f.city} onChange={set('city')} placeholder="Lagos" /></Field>
          <Field label="Type"><select value={f.type} onChange={set('type')}>{['Regular', 'VIP', 'Wholesale', 'One-time'].map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Birthday (DD/MM)"><input value={f.bday} onChange={set('bday')} placeholder="14/02" maxLength={5} /></Field>
        </div>
      ) : (
        <div className="form-grid">
          <Field label="Source"><select value={f.source} onChange={set('source')}>
            <option value="">Select…</option>{['Instagram', 'WhatsApp', 'Referral', 'Walk-in', 'Facebook', 'TikTok', 'Other'].map(s => <option key={s}>{s}</option>)}
          </select></Field>
          <Field label="Referred by"><select value={f.refby} onChange={set('refby')}>
            <option value="">None</option>{ws.customers.filter(c => c.id !== editing?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></Field>
          <Field label="Scent preferences" full><input value={f.scent} onChange={set('scent')} placeholder="e.g. Oud, rose, warm scents" /></Field>
          <Field label="Notes" full><input value={f.notes} onChange={set('notes')} placeholder="Notes…" /></Field>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Supplier ---------------- */
export function SupplierForm({ open, onClose, editing }: FormProps<Supplier>) {
  const { ws, save, showToast } = useTraqi();
  const blank = { name: '', phone: '', wa: '', leadDays: '', products: '', notes: '' };
  const [f, setF] = useState<any>(blank);
  useEffect(() => { setF(editing ? { ...editing, leadDays: String(editing.leadDays ?? '') } : blank); }, [editing, open]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    if (!f.name || !f.phone) { showToast('Name and phone are required'); return; }
    const rec: Supplier = {
      id: editing?.id || nextId('SUP', ws.suppliers), name: f.name.trim(), phone: f.phone.trim(),
      wa: f.wa || f.phone, products: f.products, leadDays: parseInt(f.leadDays) || 0,
      lastOrder: editing?.lastOrder || '', notes: f.notes
    };
    save('suppliers', editing ? ws.suppliers.map(s => (s.id === rec.id ? rec : s)) : [...ws.suppliers, rec]);
    showToast('Supplier ' + (editing ? 'updated' : 'added'));
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Supplier' : 'Add Supplier'} icon={Truck}
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Save</button></>}>
      <div className="form-grid">
        <Field label="Name *"><input value={f.name} onChange={set('name')} placeholder="Vendor name" /></Field>
        <Field label="Phone *"><input value={f.phone} onChange={set('phone')} placeholder="0801…" /></Field>
        <Field label="WhatsApp"><input value={f.wa} onChange={set('wa')} placeholder="0801…" /></Field>
        <Field label="Lead time (days)"><input type="number" value={f.leadDays} onChange={set('leadDays')} placeholder="7" /></Field>
        <Field label="Products supplied" full><input value={f.products} onChange={set('products')} placeholder="e.g. Oud oils" /></Field>
        <Field label="Notes" full><textarea value={f.notes} onChange={set('notes')} /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Expense ---------------- */
export function ExpenseForm({ open, onClose, editing }: FormProps<Expense>) {
  const { ws, save, log, showToast } = useTraqi();
  const blank = { date: todayStr(), cat: '', desc: '', amt: '', by: 'Owner' };
  const [f, setF] = useState<any>(blank);
  useEffect(() => { setF(editing ? { ...editing, amt: String(editing.amt) } : blank); }, [editing, open]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    if (!f.date || !f.cat || !f.desc || !f.amt) { showToast('Fill the required fields'); return; }
    const rec: Expense = { id: editing?.id || nextId('EXP', ws.expenses), date: f.date, cat: f.cat, desc: f.desc, amt: parseFloat(f.amt) || 0, by: f.by };
    save('expenses', editing ? ws.expenses.map(e => (e.id === rec.id ? rec : e)) : [...ws.expenses, rec]);
    log('Expense ' + (editing ? 'updated' : 'added'), rec.desc);
    showToast('Expense saved');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Expense' : 'Add Expense'} icon={Wallet}
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Save</button></>}>
      <div className="form-grid">
        <Field label="Date *"><input type="date" value={f.date} onChange={set('date')} /></Field>
        <Field label="Category *"><select value={f.cat} onChange={set('cat')}>
          <option value="">Select…</option>
          {['Packaging', 'Delivery / Logistics', 'Marketing / Ads', 'Airtime / Data', 'Rent / Market Fee', 'Staff / Labour', 'Equipment', 'Other'].map(c => <option key={c}>{c}</option>)}
        </select></Field>
        <Field label="Description *" full><input value={f.desc} onChange={set('desc')} placeholder="e.g. 50 gift boxes" /></Field>
        <Field label="Amount (₦) *"><input type="number" value={f.amt} onChange={set('amt')} placeholder="5000" /></Field>
        <Field label="Paid by"><select value={f.by} onChange={set('by')}>{['Owner', 'Business Account', 'Cash', 'Transfer'].map(b => <option key={b}>{b}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Debt ---------------- */
export function DebtForm({ open, onClose, editing }: FormProps<Debt>) {
  const { ws, save, showToast } = useTraqi();
  const blank = { date: todayStr(), custId: '', prod: '', total: '', paid: '0', due: '' };
  const [f, setF] = useState<any>(blank);
  useEffect(() => { setF(editing ? { ...editing, total: String(editing.total), paid: String(editing.paid) } : blank); }, [editing, open]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    if (!f.date || !f.custId || !f.total) { showToast('Fill the required fields'); return; }
    const cust = ws.customers.find(c => c.id === f.custId);
    const total = parseFloat(f.total) || 0, paid = parseFloat(f.paid) || 0;
    const rec: Debt = {
      id: editing?.id || nextId('DBT', ws.debts), date: f.date, custId: f.custId, custName: cust?.name || '',
      prod: f.prod, total, paid, due: f.due, status: paid >= total ? 'Cleared' : paid > 0 ? 'Partial' : 'Unpaid'
    };
    save('debts', editing ? ws.debts.map(d => (d.id === rec.id ? rec : d)) : [...ws.debts, rec]);
    showToast('Debt saved');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Debt' : 'Add Debt'} icon={Hourglass}
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Save</button></>}>
      <div className="form-grid">
        <Field label="Date *"><input type="date" value={f.date} onChange={set('date')} /></Field>
        <Field label="Customer *"><select value={f.custId} onChange={set('custId')}>
          <option value="">Select…</option>{ws.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></Field>
        <Field label="Product / description" full><input value={f.prod} onChange={set('prod')} placeholder="What was bought" /></Field>
        <Field label="Total (₦) *"><input type="number" value={f.total} onChange={set('total')} placeholder="8500" /></Field>
        <Field label="Paid (₦)"><input type="number" value={f.paid} onChange={set('paid')} /></Field>
        <Field label="Due date"><input type="date" value={f.due} onChange={set('due')} /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Return ---------------- */
export function ReturnForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ws, save, log, showToast } = useTraqi();
  const blank = { date: todayStr(), custId: '', prodId: '', qty: '1', amt: '', action: 'Full Refund', reason: '' };
  const [f, setF] = useState<any>(blank);
  useEffect(() => { setF(blank); }, [open]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    if (!f.date || !f.prodId || !f.reason) { showToast('Fill the required fields'); return; }
    const cust = ws.customers.find(c => c.id === f.custId);
    const prod = ws.products.find(p => p.id === f.prodId);
    save('returns', [...ws.returns, {
      id: nextId('RET', ws.returns), date: f.date, custId: f.custId, custName: cust?.name || 'Walk-in',
      prodId: f.prodId, prodName: prod?.name || '', qty: parseInt(f.qty) || 1,
      amt: parseFloat(f.amt) || 0, reason: f.reason, action: f.action
    }]);
    log('Return logged', (prod?.name || '') + ' — ' + f.reason);
    showToast('Return logged');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Log Return" icon={RotateCcw}
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Log Return</button></>}>
      <div className="form-grid">
        <Field label="Date *"><input type="date" value={f.date} onChange={set('date')} /></Field>
        <Field label="Customer"><select value={f.custId} onChange={set('custId')}>
          <option value="">Select…</option>{ws.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></Field>
        <Field label="Product *" full><select value={f.prodId} onChange={set('prodId')}>
          <option value="">Select…</option>{ws.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></Field>
        <Field label="Qty *"><input type="number" min={1} value={f.qty} onChange={set('qty')} /></Field>
        <Field label="Refund (₦)"><input type="number" value={f.amt} onChange={set('amt')} placeholder="0" /></Field>
        <Field label="Action"><select value={f.action} onChange={set('action')}>
          {['Full Refund', 'Exchange', 'Store Credit', 'No Refund'].map(a => <option key={a}>{a}</option>)}
        </select></Field>
        <Field label="Reason *" full><input value={f.reason} onChange={set('reason')} placeholder="e.g. Wrong fragrance" /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Restock ---------------- */
export function RestockForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ws, save, log, showToast, requiresApproval, submitApproval } = useTraqi();
  const [f, setF] = useState({ prodId: '', qty: '', date: todayStr() });
  useEffect(() => { setF({ prodId: '', qty: '', date: todayStr() }); }, [open]);
  const submit = () => {
    const qty = parseInt(f.qty) || 0;
    if (!f.prodId || !qty) { showToast('Select a product and quantity'); return; }
    const p = ws.products.find(x => x.id === f.prodId);
    if (requiresApproval('restock')) {
      submitApproval('restock', { prodId: f.prodId, qty, prodName: p?.name }, `Restock ${p?.name} (+${qty})`);
      onClose(); return;
    }
    save('products', ws.products.map(x => (x.id === f.prodId ? { ...x, restocked: (x.restocked || 0) + qty } : x)));
    log('Restocked', `${p?.name} +${qty} units`);
    showToast('Restocked: ' + p?.name);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Restock" icon={Boxes} narrow
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Confirm</button></>}>
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Product *"><select value={f.prodId} onChange={e => setF({ ...f, prodId: e.target.value })}>
          <option value="">Select…</option>{ws.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></Field>
        <Field label="Units *"><input type="number" min={1} value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} placeholder="20" /></Field>
        <Field label="Date"><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Monthly target ---------------- */
export function TargetForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ws, saveTargets, showToast } = useTraqi();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [m, setM] = useState(new Date().getMonth());
  const [amt, setAmt] = useState('');
  useEffect(() => {
    const key = (new Date().getMonth() + 1) + '-' + new Date().getFullYear();
    setM(new Date().getMonth());
    setAmt(ws.targets[key] ? String(ws.targets[key]) : '');
  }, [open, ws.targets]);
  const submit = () => {
    const v = parseFloat(amt);
    if (!v) { showToast('Enter a target amount'); return; }
    saveTargets({ ...ws.targets, [(m + 1) + '-' + new Date().getFullYear()]: v });
    showToast('Target set');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Monthly Target" icon={Target} narrow
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Set Target</button></>}>
      <div className="form-grid">
        <Field label="Month"><select value={m} onChange={e => setM(parseInt(e.target.value))}>
          {months.map((mo, i) => <option key={mo} value={i}>{mo}</option>)}
        </select></Field>
        <Field label="Target (₦) *"><input type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder="500000" /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Assistant ---------------- */
export function AssistantForm({ open, onClose, editing }: FormProps<Assistant>) {
  const { ws, save, log, showToast, hasFeature, tier, fbUser } = useTraqi();
  const [saving, setSaving] = useState(false);
  const blankA = { name: '', phone: '', email: '', pin: '', pin2: '' };
  const [f, setF] = useState<any>(blankA);
  const [showPin, setShowPin] = useState(false);
  const [showPin2, setShowPin2] = useState(false);
  const [perms, setPerms] = useState<string[]>(PERMISSIONS.low.map(p => p.key));
  useEffect(() => {
    setF(editing
      ? { name: editing.name, phone: editing.phone || '', email: editing.email || '', pin: editing.pin, pin2: editing.pin }
      : blankA);
    setPerms(editing ? editing.perms || [] : PERMISSIONS.low.map(p => p.key));
    setShowPin(false); setShowPin2(false);
  }, [editing, open]);
  const pinMismatch = f.pin2.length > 0 && !f.pin.startsWith(f.pin2);
  const toggle = (k: string) => setPerms(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]));
  const submit = async () => {
    /* The Team page is already gated by tier; this is the same rule at the
       point of write, so no route can slip an assistant past it. */
    if (!hasFeature('team')) { showToast(`Team members are on Pro — ${tier.name} doesn't include them`); return; }
    if (!f.name) { showToast('Enter the assistant name'); return; }
    /* Phone and email are what the invitation travels on, so both are required. */
    if (!f.phone.trim()) { showToast('A phone number is required — the invite goes out on WhatsApp'); return; }
    const email = f.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) { showToast('Enter a valid email address for the assistant'); return; }
    if (ws.assistants.some(a => a.id !== editing?.id && (a.email || '').toLowerCase() === email)) {
      showToast('Another team member already uses that email'); return;
    }
    if (!/^\d{4}$/.test(f.pin)) { showToast('PIN must be 4 digits'); return; }
    if (f.pin !== f.pin2) { showToast('PINs do not match'); return; }

    /* Usernames are unique across Traqi, so the name is put aside now rather
       than at sign-up — otherwise two businesses could hand out the same one
       and whoever joined second would lose it. */
    const id = editing?.id || 'AST-' + Date.now();
    const username = f.name.trim();
    if (!editing?.accountUid && usernameKey(username) !== usernameKey(editing?.name || '')) {
      setSaving(true);
      try {
        await reserveUsername(username, email, fbUser?.uid || '', id);
        if (editing?.name) await releaseUsername(editing.name);
      } catch (err: any) {
        setSaving(false);
        showToast(err instanceof UsernameTaken ? err.message : 'Could not check that username — try again');
        return;
      }
      setSaving(false);
    }

    const rec: Assistant = {
      id, name: username, pin: f.pin, phone: f.phone.trim(),
      email, perms, active: editing ? editing.active !== false : true,
      created: editing?.created || new Date().toISOString(),
      /* Carried over so an existing invite link keeps working after an edit.
         Only ever spread when set — an undefined field would be sent to
         Firestore and take the whole save down with it. */
      ...(editing?.inviteToken ? { inviteToken: editing.inviteToken } : {}),
      ...(editing?.accountUid ? { accountUid: editing.accountUid } : {}),
      ...(editing?.onboardedAt ? { onboardedAt: editing.onboardedAt } : {})
    };
    save('assistants', editing ? ws.assistants.map(a => (a.id === rec.id ? rec : a)) : [...ws.assistants, rec]);
    log(editing ? 'Updated assistant' : 'Registered assistant', `${rec.name} (${perms.length} permissions)`);
    showToast('Assistant ' + (editing ? 'updated' : 'registered'));
    onClose();
  };
  const groups: [string, string, typeof PERMISSIONS.low][] = [
    ['low', 'Low risk — pre-selected', PERMISSIONS.low],
    ['medium', 'Medium risk', PERMISSIONS.medium],
    ['high', 'High risk', PERMISSIONS.high]
  ];
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit ' + editing.name : 'Register Assistant'} icon={UserPlus} wide
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Checking…' : 'Save Assistant'}</button></>}>
      <div className="form-grid" style={{ marginBottom: 18 }}>
        <Field label="Assistant username *"
          hint={editing?.accountUid
            ? 'Fixed — they already sign in with this username'
            : "What they'll be known by — and can sign in with. Must be unique across Traqi."}>
          <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })}
            placeholder="e.g. Blessing" disabled={!!editing?.accountUid} />
        </Field>
        <Field label="Phone *" hint="Used to send the invite on WhatsApp">
          <input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="0801…" />
        </Field>
        <Field label="Email *" full hint="The invite is addressed here, and only this address can claim the seat">
          <input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })}
            placeholder="blessing@example.com" disabled={!!editing?.accountUid} />
        </Field>
      </div>

      <div className="muted-box" style={{ marginBottom: 18 }}>
        <p className="label" style={{ margin: '0 0 4px' }}>Private PIN</p>
        <p className="hint" style={{ margin: '0 0 12px', lineHeight: 1.55 }}>
          Hand the phone over and let {f.name.trim() || 'your assistant'} type their own 4-digit PIN — it&apos;s
          how they sign in on your device, so it should be theirs alone.
        </p>
        <div className="form-grid">
          <Field label="PIN (4 digits) *">
            <div className="eye-wrap">
              <input type={showPin ? 'text' : 'password'} className="pin-input" maxLength={4} inputMode="numeric"
                value={f.pin} onChange={e => setF({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="••••" {...NO_AUTOFILL} />
              <button className="eye-btn" onClick={() => setShowPin(v => !v)} tabIndex={-1}>{showPin ? <EyeOff /> : <Eye />}</button>
            </div>
          </Field>
          <Field label="Confirm PIN *">
            <div className="eye-wrap">
              <input type={showPin2 ? 'text' : 'password'} className="pin-input" maxLength={4} inputMode="numeric"
                value={f.pin2} onChange={e => setF({ ...f, pin2: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="••••" {...NO_AUTOFILL} />
              <button className="eye-btn" onClick={() => setShowPin2(v => !v)} tabIndex={-1}>{showPin2 ? <EyeOff /> : <Eye />}</button>
            </div>
            {pinMismatch && <span className="field-err">PINs do not match.</span>}
          </Field>
        </div>
      </div>
      <p className="label" style={{ marginBottom: 10 }}>Permissions</p>
      {groups.map(([key, label, items]) => (
        <div className="perm-group" key={key}>
          <div className={'perm-title ' + key}>{label}</div>
          {items.map(p => (
            <div className="perm-item" key={p.key}>
              <input type="checkbox" id={'perm_' + p.key} checked={perms.includes(p.key)} onChange={() => toggle(p.key)} />
              <label htmlFor={'perm_' + p.key}>
                <strong>{p.label}</strong>
                <div className="perm-desc">{p.desc}{APPROVAL_REQUIRED.includes(p.key) ? ' · needs owner approval' : ''}</div>
              </label>
            </div>
          ))}
        </div>
      ))}
    </Modal>
  );
}

/* ---------------- Task ---------------- */
export function TaskForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ws, user, save, log, showToast } = useTraqi();
  const [f, setF] = useState<any>({ title: '', description: '', dueDate: '', priority: 'normal', assignedTo: [] as string[] });
  useEffect(() => { setF({ title: '', description: '', dueDate: '', priority: 'normal', assignedTo: [] }); }, [open]);
  const submit = () => {
    if (!f.title) { showToast('Enter a task title'); return; }
    if (!f.assignedTo.length) { showToast('Select at least one assistant'); return; }
    save('tasks', [...ws.tasks, {
      id: 'TSK-' + Date.now(), title: f.title, description: f.description, assignedTo: f.assignedTo,
      assignedBy: user.id || 'owner', assignedByName: user.name, dueDate: f.dueDate,
      priority: f.priority, status: 'pending' as const, acknowledged: {}, completed: {},
      feedback: [], created: new Date().toISOString()
    }]);
    const names = f.assignedTo.map((id: string) => ws.assistants.find(a => a.id === id)?.name || id).join(', ');
    log('Task assigned', `${f.title} to ${names}`);
    showToast('Task assigned to ' + names);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Assign Task" icon={ListChecks} wide
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Assign Task</button></>}>
      <div className="form-grid">
        <Field label="Task title *" full><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Arrange the new stock display" /></Field>
        <Field label="Description" full><textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Detailed instructions…" /></Field>
        <Field label="Assign to *" hint="Hold Ctrl / Cmd to select several">
          <select multiple style={{ minHeight: 92 }} value={f.assignedTo}
            onChange={e => setF({ ...f, assignedTo: Array.from(e.target.selectedOptions).map(o => o.value) })}>
            {ws.assistants.filter(a => a.active !== false).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Priority"><select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>
          <option value="normal">Normal</option><option value="urgent">Urgent</option>
        </select></Field>
        <Field label="Due date"><input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Message ---------------- */
export function MessageForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ws, user, isOwner, save, log, showToast } = useTraqi();
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  useEffect(() => { setTo(''); setText(''); }, [open]);
  const submit = () => {
    if (!to || !text.trim()) { showToast('Select a recipient and type a message'); return; }
    let recipients: string[] = [], toName = '';
    if (to === 'all_assistants') { recipients = ws.assistants.filter(a => a.active !== false).map(a => a.id); toName = 'All assistants'; }
    else if (to === 'owner') { recipients = ['owner']; toName = ws.config.ownerName; }
    else { recipients = [to]; toName = ws.assistants.find(a => a.id === to)?.name || to; }
    save('messages', [...ws.messages, {
      id: 'MSG-' + Date.now(), from: isOwner ? 'owner' : user.id, fromName: user.name,
      to: recipients, toName, type: to === 'all_assistants' ? 'broadcast' as const : 'message' as const,
      text: text.trim(), readBy: {}, ts: new Date().toISOString()
    }]);
    log('Sent message', 'To ' + toName);
    showToast('Message sent to ' + toName);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="New Message" icon={Send} narrow
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Send</button></>}>
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="To *"><select value={to} onChange={e => setTo(e.target.value)}>
          <option value="">Select recipient…</option>
          {isOwner
            ? <>
                <option value="all_assistants">All assistants (broadcast)</option>
                {ws.assistants.filter(a => a.active !== false).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </>
            : <>
                <option value="owner">Owner ({ws.config.ownerName})</option>
                {ws.assistants.filter(a => a.active !== false && a.id !== user.id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </>}
        </select></Field>
        <Field label="Message *"><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type your message…" style={{ minHeight: 110 }} /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Task feedback ---------------- */
export function FeedbackForm({ open, onClose, taskId }: { open: boolean; onClose: () => void; taskId: string }) {
  const { ws, user, save, log, showToast } = useTraqi();
  const [text, setText] = useState('');
  useEffect(() => { setText(''); }, [open]);
  const task = ws.tasks.find(t => t.id === taskId);
  const submit = () => {
    if (!text.trim() || !task) { showToast('Enter your feedback'); return; }
    save('tasks', ws.tasks.map(t => t.id === taskId
      ? { ...t, feedback: [...(t.feedback || []), { from: user.id, name: user.name, text: text.trim(), ts: new Date().toISOString() }] }
      : t));
    log('Task feedback', task.title);
    showToast('Feedback sent');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={'Feedback: ' + (task?.title || '')} icon={MessageSquare} narrow
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Send Feedback</button></>}>
      <Field label="Your feedback *"><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type your feedback on this task…" style={{ minHeight: 110 }} /></Field>
    </Modal>
  );
}
