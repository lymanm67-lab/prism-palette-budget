// Mock/seed data for demo mode before real DB is populated

export const CATEGORY_GROUPS = [
  { id: 'cg1', name: 'Housing', color: 'var(--prism-violet)' },
  { id: 'cg2', name: 'Food & Drink', color: 'var(--prism-teal)' },
  { id: 'cg3', name: 'Transportation', color: 'var(--prism-amber)' },
  { id: 'cg4', name: 'Shopping', color: 'var(--prism-rose)' },
  { id: 'cg5', name: 'Entertainment', color: 'var(--prism-sky)' },
  { id: 'cg6', name: 'Health', color: 'var(--prism-lime)' },
  { id: 'cg7', name: 'Income', color: 'var(--prism-positive)' },
];

export const CATEGORIES = [
  { id: 'c1', name: 'Rent/Mortgage', groupId: 'cg1', color: '#7c5cf5' },
  { id: 'c2', name: 'Utilities', groupId: 'cg1', color: '#9b7dff' },
  { id: 'c3', name: 'Groceries', groupId: 'cg2', color: '#2eb88a' },
  { id: 'c4', name: 'Restaurants', groupId: 'cg2', color: '#3dd9a4' },
  { id: 'c5', name: 'Gas', groupId: 'cg3', color: '#e5a525' },
  { id: 'c6', name: 'Public Transit', groupId: 'cg3', color: '#f0be45' },
  { id: 'c7', name: 'Clothing', groupId: 'cg4', color: '#e5547a' },
  { id: 'c8', name: 'Electronics', groupId: 'cg4', color: '#f07090' },
  { id: 'c9', name: 'Subscriptions', groupId: 'cg5', color: '#3b9fe5' },
  { id: 'c10', name: 'Movies & Games', groupId: 'cg5', color: '#55b5f5' },
  { id: 'c11', name: 'Doctor', groupId: 'cg6', color: '#5cb850' },
  { id: 'c12', name: 'Pharmacy', groupId: 'cg6', color: '#70d065' },
  { id: 'c13', name: 'Salary', groupId: 'cg7', color: '#2d9e6f' },
  { id: 'c14', name: 'Freelance', groupId: 'cg7', color: '#3dbe85' },
];

export const MOCK_ACCOUNTS = [
  { id: 'a1', name: 'Chase Checking', institution: 'Chase', type: 'checking' as const, balance: 4523.67, lastSync: '2026-03-05T10:00:00Z' },
  { id: 'a2', name: 'Chase Savings', institution: 'Chase', type: 'savings' as const, balance: 12850.00, lastSync: '2026-03-05T10:00:00Z' },
  { id: 'a3', name: 'Amex Platinum', institution: 'American Express', type: 'credit' as const, balance: -2340.55, lastSync: '2026-03-05T09:30:00Z' },
  { id: 'a4', name: 'Vanguard 401k', institution: 'Vanguard', type: 'investment' as const, balance: 87420.30, lastSync: '2026-03-04T22:00:00Z' },
  { id: 'a5', name: 'Auto Loan', institution: 'Capital One', type: 'loan' as const, balance: -15200.00, lastSync: '2026-03-05T08:00:00Z' },
];

export const MOCK_TRANSACTIONS = [
  { id: 't1', date: '2026-03-05', merchant: 'Whole Foods Market', amount: -82.34, categoryId: 'c3', accountId: 'a1', notes: '' },
  { id: 't2', date: '2026-03-04', merchant: 'Shell Gas Station', amount: -45.20, categoryId: 'c5', accountId: 'a3', notes: '' },
  { id: 't3', date: '2026-03-04', merchant: 'Netflix', amount: -15.99, categoryId: 'c9', accountId: 'a3', notes: '' },
  { id: 't4', date: '2026-03-03', merchant: 'Employer Direct Deposit', amount: 3250.00, categoryId: 'c13', accountId: 'a1', notes: 'Bi-weekly paycheck' },
  { id: 't5', date: '2026-03-03', merchant: 'Chipotle', amount: -12.45, categoryId: 'c4', accountId: 'a3', notes: '' },
  { id: 't6', date: '2026-03-02', merchant: 'Target', amount: -67.89, categoryId: 'c7', accountId: 'a3', notes: '' },
  { id: 't7', date: '2026-03-02', merchant: 'Spotify', amount: -9.99, categoryId: 'c9', accountId: 'a1', notes: '' },
  { id: 't8', date: '2026-03-01', merchant: 'Rent Payment', amount: -1800.00, categoryId: 'c1', accountId: 'a1', notes: 'March rent' },
  { id: 't9', date: '2026-03-01', merchant: 'Electric Company', amount: -125.50, categoryId: 'c2', accountId: 'a1', notes: '' },
  { id: 't10', date: '2026-02-28', merchant: 'Amazon', amount: -34.99, categoryId: 'c8', accountId: 'a3', notes: 'Headphones' },
  { id: 't11', date: '2026-02-27', merchant: 'CVS Pharmacy', amount: -22.50, categoryId: 'c12', accountId: 'a1', notes: '' },
  { id: 't12', date: '2026-02-26', merchant: 'Uber', amount: -18.75, categoryId: 'c6', accountId: 'a3', notes: '' },
  { id: 't13', date: '2026-02-25', merchant: 'Freelance Client', amount: 800.00, categoryId: 'c14', accountId: 'a1', notes: 'Logo design' },
  { id: 't14', date: '2026-02-24', merchant: 'Trader Joes', amount: -55.40, categoryId: 'c3', accountId: 'a1', notes: '' },
  { id: 't15', date: '2026-02-23', merchant: 'AMC Theaters', amount: -28.00, categoryId: 'c10', accountId: 'a3', notes: '' },
];

export const MOCK_BUDGETS = [
  { categoryId: 'c1', planned: 1800, spent: 1800 },
  { categoryId: 'c2', planned: 200, spent: 125.50 },
  { categoryId: 'c3', planned: 400, spent: 137.74 },
  { categoryId: 'c4', planned: 150, spent: 12.45 },
  { categoryId: 'c5', planned: 100, spent: 45.20 },
  { categoryId: 'c7', planned: 200, spent: 67.89 },
  { categoryId: 'c9', planned: 50, spent: 25.98 },
  { categoryId: 'c10', planned: 75, spent: 28.00 },
];

export const MONTHLY_CASHFLOW = [
  { month: 'Oct', income: 7100, expenses: 4800 },
  { month: 'Nov', income: 6500, expenses: 5200 },
  { month: 'Dec', income: 7800, expenses: 6100 },
  { month: 'Jan', income: 6500, expenses: 4500 },
  { month: 'Feb', income: 7300, expenses: 5000 },
  { month: 'Mar', income: 4050, expenses: 2245 },
];

export const NET_WORTH_HISTORY = [
  { month: 'Oct', assets: 98000, liabilities: 20000, net: 78000 },
  { month: 'Nov', assets: 99500, liabilities: 19500, net: 80000 },
  { month: 'Dec', assets: 101000, liabilities: 19000, net: 82000 },
  { month: 'Jan', assets: 102500, liabilities: 18500, net: 84000 },
  { month: 'Feb', assets: 104000, liabilities: 18000, net: 86000 },
  { month: 'Mar', assets: 104793, liabilities: 17540, net: 87253 },
];

export const SPENDING_BY_CATEGORY = [
  { name: 'Housing', value: 1925.50, color: '#7c5cf5' },
  { name: 'Food & Drink', value: 150.19, color: '#2eb88a' },
  { name: 'Transportation', value: 63.95, color: '#e5a525' },
  { name: 'Shopping', value: 102.88, color: '#e5547a' },
  { name: 'Entertainment', value: 53.98, color: '#3b9fe5' },
  { name: 'Health', value: 22.50, color: '#5cb850' },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
