import { format } from 'date-fns';

interface ExportableTransaction {
  id: string;
  date: string;
  merchant: string | null;
  amount: number;
  account_id: string;
  category_id: string | null;
  notes: string | null;
  tags: string[] | null;
  accounts?: { name: string } | null;
  categories?: { name: string } | null;
}

/**
 * Exports transactions to CSV format and triggers download
 */
export function exportTransactionsToCsv(
  transactions: ExportableTransaction[],
  filename?: string
) {
  const headers = ['Date', 'Merchant', 'Amount', 'Account', 'Category', 'Notes', 'Tags'];
  
  const rows = transactions.map(t => [
    t.date,
    t.merchant || '',
    t.amount.toFixed(2),
    t.accounts?.name || '',
    t.categories?.name || 'Uncategorized',
    t.notes || '',
    (t.tags || []).join('; '),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports any data array to CSV
 */
export function exportToCsv(
  headers: string[],
  rows: (string | number)[][],
  filename: string
) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
