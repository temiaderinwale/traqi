/* Traqi — domain types */

export type Product = {
  id: string; name: string; cat: string; size: string;
  cost: number; price: number; stock: number; restocked: number;
  reorder: number; usageDays: number; supplier: string; notes: string;
};

export type Customer = {
  id: string; name: string; phone: string; wa: string; insta: string; city: string;
  type: 'Regular' | 'VIP' | 'Wholesale' | 'One-time' | string;
  bday: string; source: string; refby: string; scent: string; notes: string;
};

export type Sale = {
  id: string; orderId: string; date: string; custId: string; custName: string;
  prodId: string; prodName: string; cat: string; qty: number; price: number; cost: number;
  status: 'Paid' | 'Pending' | 'Part Payment' | string;
  channel: string; notes: string; recNum: string; discount: number; receiptNote: string;
  recordedBy: string; recordedByName: string;
};

export type Return = {
  id: string; date: string; custId: string; custName: string;
  prodId: string; prodName: string; qty: number; amt: number; reason: string; action: string;
};

export type Supplier = {
  id: string; name: string; phone: string; wa: string;
  products: string; leadDays: number; lastOrder: string; notes: string;
};

export type Expense = { id: string; date: string; cat: string; desc: string; amt: number; by: string };

export type Debt = {
  id: string; date: string; custId: string; custName: string; prod: string;
  total: number; paid: number; due: string; status: 'Cleared' | 'Partial' | 'Unpaid' | string;
};

export type Assistant = {
  id: string; name: string; pin: string; phone: string;
  perms: string[]; active: boolean; created: string;
};

export type PendingItem = {
  id: string; ts: string; type: 'add_product' | 'restock' | 'edit_product';
  data: any; label: string; submittedBy: string; submitterName: string;
  status: 'pending' | 'approved' | 'rejected';
};

export type AuditEntry = {
  id: string; ts: string; userId: string; userName: string;
  role: string; action: string; detail: string; extra?: string;
};

export type Task = {
  id: string; title: string; description: string; assignedTo: string[];
  assignedBy: string; assignedByName: string; dueDate: string;
  priority: 'normal' | 'urgent'; status: 'pending' | 'acknowledged' | 'done';
  acknowledged: Record<string, string>; completed: Record<string, string>;
  feedback: { from: string; name: string; text: string; ts: string }[];
  created: string;
};

export type Message = {
  id: string; from: string; fromName: string; to: string[]; toName: string;
  type: 'message' | 'broadcast'; text: string; readBy: Record<string, boolean>;
  ts: string; deletedAt?: string; deletedBy?: string;
};

export type Config = {
  bizName: string; ownerName: string; email: string; pin: string;
  onboarded: boolean; soundOn: boolean; receiptCounter: number;
};

export type Workspace = {
  products: Product[]; customers: Customer[]; sales: Sale[]; returns: Return[];
  suppliers: Supplier[]; expenses: Expense[]; debts: Debt[];
  targets: Record<string, number>; config: Config;
  assistants: Assistant[]; pending: PendingItem[]; auditLog: AuditEntry[];
  tasks: Task[]; messages: Message[];
};

export type CollectionKey =
  | 'products' | 'customers' | 'sales' | 'returns' | 'suppliers' | 'expenses'
  | 'debts' | 'assistants' | 'pending' | 'auditLog' | 'tasks' | 'messages';

export type CurrentUser = { role: '' | 'owner' | 'assistant'; id: string; name: string; perms: string[] };

export const COLLECTIONS: CollectionKey[] = [
  'products', 'customers', 'sales', 'returns', 'suppliers', 'expenses',
  'debts', 'assistants', 'pending', 'auditLog', 'tasks', 'messages'
];

export const DEFAULT_CONFIG: Config = {
  bizName: '', ownerName: 'Owner', email: '', pin: '1234',
  onboarded: false, soundOn: false, receiptCounter: 0
};

export const emptyWorkspace = (): Workspace => ({
  products: [], customers: [], sales: [], returns: [], suppliers: [], expenses: [],
  debts: [], targets: {}, config: { ...DEFAULT_CONFIG },
  assistants: [], pending: [], auditLog: [], tasks: [], messages: []
});
