// CSV parsing utility supporting bank statements, QuickBooks, Mint, Monarch, YNAB, and generic formats

export type DetectedFormat =
  | 'chase'
  | 'bofa'
  | 'wells_fargo'
  | 'capital_one'
  | 'citi'
  | 'quickbooks'
  | 'ynab'
  | 'mint'
  | 'monarch'
  | 'generic';

export const FORMAT_LABELS: Record<DetectedFormat, string> = {
  chase: 'Chase Bank',
  bofa: 'Bank of America',
  wells_fargo: 'Wells Fargo',
  capital_one: 'Capital One',
  citi: 'Citi Bank',
  quickbooks: 'QuickBooks',
  ynab: 'YNAB',
  mint: 'Mint',
  monarch: 'Monarch Money',
  generic: 'Generic CSV',
};

export interface ParsedRow {
  date: string;
  merchant: string;
  amount: number;
  category: string;
  notes: string;
  originalRow: Record<string, string>;
}

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  detectedFormat: DetectedFormat;
}

export function parseCsvText(text: string): CsvParseResult {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }

  const detectedFormat = detectFormat(headers);
  return { headers, rows, detectedFormat };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function detectFormat(headers: string[]): DetectedFormat {
  const lower = headers.map(h => h.toLowerCase().trim());
  const joined = lower.join('|');

  // Chase: Transaction Date, Post Date, Description, Category, Type, Amount, Memo
  // or: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #
  if (
    (lower.includes('transaction date') && lower.includes('post date') && lower.includes('description')) ||
    (lower.includes('posting date') && lower.includes('details') && lower.includes('balance'))
  ) return 'chase';

  // Bank of America: Date, Description, Amount, Running Bal.
  if (lower.includes('running bal.') || (joined.includes('description') && joined.includes('running bal')))
    return 'bofa';

  // Wells Fargo: Date, Amount, *, (blank), Description  — 5 columns, often no headers or simple headers
  // Detect by column count & pattern, but with headers: Date, Amount, *, Check #, Description
  if (lower.includes('description') && (lower.includes('check #') || lower.includes('check number')))
    return 'wells_fargo';

  // Capital One: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit
  if (lower.includes('debit') && lower.includes('credit') && (lower.includes('card no.') || lower.includes('card no')))
    return 'capital_one';

  // Citi: Status, Date, Description, Debit, Credit
  if (lower.includes('status') && lower.includes('debit') && lower.includes('credit'))
    return 'citi';

  // QuickBooks: Date, Transaction Type, No., Name, Memo/Description, Split, Amount, Balance
  // or: Date, Transaction Type, Num, Name, Memo, Split, Amount
  if (lower.includes('transaction type') && (lower.includes('split') || lower.includes('num')))
    return 'quickbooks';

  // YNAB: Date, Payee, Category, Memo, Outflow, Inflow
  if (lower.includes('payee') && lower.includes('outflow') && lower.includes('inflow'))
    return 'ynab';

  // Monarch: Date, Merchant, Category, Account, Original Statement, Notes, Amount, Tags
  if (lower.includes('merchant') && lower.includes('original statement'))
    return 'monarch';

  // Mint: Date, Description, Original Description, Amount, Transaction Type, Category, Account Name
  if (lower.includes('description') && lower.includes('transaction type') && !lower.includes('split'))
    return 'mint';

  // Generic debit/credit format (common bank export)
  if (lower.includes('debit') && lower.includes('credit'))
    return 'generic';

  return 'generic';
}

export interface ColumnMapping {
  date: string;
  merchant: string;
  amount: string;
  category: string;
  notes: string;
  debit?: string;
  credit?: string;
}

export function getDefaultMapping(headers: string[], format: DetectedFormat): ColumnMapping {
  const lower = headers.map(h => h.toLowerCase().trim());
  const find = (pattern: RegExp) => headers[lower.findIndex(h => pattern.test(h))] || '';

  switch (format) {
    case 'chase':
      return {
        date: find(/^(transaction date|posting date)$/),
        merchant: find(/^description$/),
        amount: find(/^amount$/),
        category: find(/^category$/),
        notes: find(/^memo$/),
      };

    case 'bofa':
      return {
        date: find(/^date$/),
        merchant: find(/^description$/),
        amount: find(/^amount$/),
        category: '',
        notes: find(/^reference/),
      };

    case 'wells_fargo':
      return {
        date: find(/^date$/),
        merchant: find(/^description$/),
        amount: find(/^amount$/),
        category: '',
        notes: find(/^check/),
      };

    case 'capital_one':
      return {
        date: find(/^(transaction date|posted date)$/),
        merchant: find(/^description$/),
        amount: '',
        category: find(/^category$/),
        notes: '',
        debit: find(/^debit$/),
        credit: find(/^credit$/),
      };

    case 'citi':
      return {
        date: find(/^date$/),
        merchant: find(/^description$/),
        amount: '',
        category: '',
        notes: find(/^member name/),
        debit: find(/^debit$/),
        credit: find(/^credit$/),
      };

    case 'quickbooks':
      return {
        date: find(/^date$/),
        merchant: find(/^(name|payee)$/),
        amount: find(/^amount$/),
        category: find(/^(split|class)$/),
        notes: find(/^(memo|description)$/),
      };

    case 'ynab':
      return {
        date: find(/^date$/),
        merchant: find(/^payee$/),
        amount: '',
        category: find(/^category$/),
        notes: find(/^memo$/),
        debit: find(/^outflow$/),
        credit: find(/^inflow$/),
      };

    case 'monarch':
      return {
        date: headers[lower.indexOf('date')] || '',
        merchant: headers[lower.indexOf('merchant')] || '',
        amount: headers[lower.indexOf('amount')] || '',
        category: headers[lower.indexOf('category')] || '',
        notes: headers[lower.indexOf('notes')] || '',
      };

    case 'mint':
      return {
        date: headers[lower.indexOf('date')] || '',
        merchant: headers[lower.indexOf('description')] || '',
        amount: headers[lower.indexOf('amount')] || '',
        category: headers[lower.indexOf('category')] || '',
        notes: headers[lower.indexOf('notes')] || '',
      };

    default:
      return {
        date: headers.find(h => /date/i.test(h)) || headers[0] || '',
        merchant: headers.find(h => /merchant|description|payee|name/i.test(h)) || '',
        amount: headers.find(h => /^amount$|^value$|^sum$/i.test(h)) || '',
        category: headers.find(h => /category|type/i.test(h)) || '',
        notes: headers.find(h => /note|memo|comment/i.test(h)) || '',
        debit: headers.find(h => /^debit$|^withdrawal$/i.test(h)) || '',
        credit: headers.find(h => /^credit$|^deposit$/i.test(h)) || '',
      };
  }
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  format: DetectedFormat,
): ParsedRow[] {
  return rows.map(row => {
    let amount: number;

    // Handle debit/credit separate columns
    if (mapping.debit || mapping.credit) {
      const debitVal = parseFloat((row[mapping.debit || ''] || '0').replace(/[$,()]/g, '')) || 0;
      const creditVal = parseFloat((row[mapping.credit || ''] || '0').replace(/[$,()]/g, '')) || 0;
      // Debit = expense (negative), Credit = income (positive)
      amount = creditVal - debitVal;
      // YNAB uses Outflow/Inflow (both positive numbers)
      if (format === 'ynab') {
        amount = creditVal - debitVal;
      }
    } else {
      amount = parseFloat((row[mapping.amount] || '0').replace(/[$,()]/g, ''));
      // Handle parentheses as negative: (50.00) → -50
      if ((row[mapping.amount] || '').includes('(')) {
        amount = -Math.abs(amount);
      }
    }

    // Mint-specific: positive=expense, negative=income based on Transaction Type
    if (format === 'mint') {
      const txnType = (row['Transaction Type'] || row['transaction type'] || '').toLowerCase();
      if (txnType === 'debit') amount = -Math.abs(amount);
      else if (txnType === 'credit') amount = Math.abs(amount);
    }

    // Chase credit card: amounts are already negative for charges, positive for payments
    // Chase checking: might need Type column
    if (format === 'chase') {
      const type = (row['Type'] || row['type'] || '').toLowerCase();
      if (type === 'debit' || type === 'sale') amount = -Math.abs(amount);
    }

    return {
      date: normalizeDate(row[mapping.date] || ''),
      merchant: (row[mapping.merchant] || '').trim(),
      amount,
      category: (row[mapping.category] || '').trim(),
      notes: (row[mapping.notes] || '').trim(),
      originalRow: row,
    };
  }).filter(r => r.date && !isNaN(r.amount) && r.amount !== 0);
}

function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const cleaned = dateStr.trim();

  // Handle MM/DD/YYYY or M/D/YYYY or MM/DD/YY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    let year = slashMatch[3];
    if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
    return `${year}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`;
  }

  // Handle DD/MM/YYYY (UK format — less common, we assume US first)
  // Handle MM-DD-YYYY
  const dashMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    return `${dashMatch[3]}-${dashMatch[1].padStart(2, '0')}-${dashMatch[2].padStart(2, '0')}`;
  }

  // Handle YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // Handle YYYYMMDD
  const compactMatch = cleaned.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }

  // Handle "Month DD, YYYY" (e.g., "March 05, 2026")
  const longMatch = cleaned.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longMatch) {
    const d = new Date(`${longMatch[1]} ${longMatch[2]}, ${longMatch[3]}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // Try generic Date parse
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return cleaned;
}
