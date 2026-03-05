// CSV parsing utility for Mint and Monarch Money formats

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
  detectedFormat: 'mint' | 'monarch' | 'generic';
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

function detectFormat(headers: string[]): 'mint' | 'monarch' | 'generic' {
  const lower = headers.map(h => h.toLowerCase());
  // Monarch: Date, Merchant, Category, Account, Original Statement, Notes, Amount, Tags
  if (lower.includes('merchant') && lower.includes('original statement')) return 'monarch';
  // Mint: Date, Description, Original Description, Amount, Transaction Type, Category, Account Name, Labels, Notes
  if (lower.includes('description') && lower.includes('transaction type')) return 'mint';
  return 'generic';
}

export interface ColumnMapping {
  date: string;
  merchant: string;
  amount: string;
  category: string;
  notes: string;
}

export function getDefaultMapping(headers: string[], format: 'mint' | 'monarch' | 'generic'): ColumnMapping {
  const lower = headers.map(h => h.toLowerCase());

  if (format === 'monarch') {
    return {
      date: headers[lower.indexOf('date')] || '',
      merchant: headers[lower.indexOf('merchant')] || '',
      amount: headers[lower.indexOf('amount')] || '',
      category: headers[lower.indexOf('category')] || '',
      notes: headers[lower.indexOf('notes')] || '',
    };
  }

  if (format === 'mint') {
    return {
      date: headers[lower.indexOf('date')] || '',
      merchant: headers[lower.indexOf('description')] || '',
      amount: headers[lower.indexOf('amount')] || '',
      category: headers[lower.indexOf('category')] || '',
      notes: headers[lower.indexOf('notes')] || '',
    };
  }

  // Generic: best-guess
  return {
    date: headers.find(h => /date/i.test(h)) || headers[0] || '',
    merchant: headers.find(h => /merchant|description|payee|name/i.test(h)) || '',
    amount: headers.find(h => /amount|value|sum/i.test(h)) || '',
    category: headers.find(h => /category|type/i.test(h)) || '',
    notes: headers.find(h => /note|memo|comment/i.test(h)) || '',
  };
}

export function applyMapping(rows: Record<string, string>[], mapping: ColumnMapping, isMintFormat: boolean): ParsedRow[] {
  return rows.map(row => {
    let amount = parseFloat((row[mapping.amount] || '0').replace(/[$,]/g, ''));
    
    // Mint uses positive numbers for expenses and has a "Transaction Type" column
    // "debit" = expense (should be negative), "credit" = income (should be positive)
    if (isMintFormat) {
      const txnType = (row['Transaction Type'] || row['transaction type'] || '').toLowerCase();
      if (txnType === 'debit') amount = -Math.abs(amount);
      else if (txnType === 'credit') amount = Math.abs(amount);
    }

    return {
      date: normalizeDate(row[mapping.date] || ''),
      merchant: row[mapping.merchant] || '',
      amount,
      category: row[mapping.category] || '',
      notes: row[mapping.notes] || '',
      originalRow: row,
    };
  }).filter(r => r.date && !isNaN(r.amount));
}

function normalizeDate(dateStr: string): string {
  // Handle MM/DD/YYYY or M/D/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`;
  }
  // Handle YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Try Date parse
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return dateStr;
}
