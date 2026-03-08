// QIF (Quicken Interchange Format) parser
// Supports: Bank, CCard, Cash, Invst account types

export interface QifTransaction {
  date: string;       // YYYY-MM-DD
  amount: number;
  merchant: string;   // Payee
  memo: string;
  category: string;
  checkNum: string;
  clearedStatus: string;
}

export interface QifParseResult {
  transactions: QifTransaction[];
  accountType: string; // Bank, CCard, Cash, etc.
}

/**
 * Parse QIF file content into structured transactions.
 * QIF uses line-prefix codes: D=date, T=amount, P=payee, M=memo, L=category, N=check#, C=cleared, ^=end of record
 */
export function parseQifText(text: string): QifParseResult {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let accountType = '';
  const transactions: QifTransaction[] = [];

  let current: Partial<QifTransaction> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Account type header: !Type:Bank, !Type:CCard, etc.
    if (line.startsWith('!Type:') || line.startsWith('!type:')) {
      accountType = line.substring(6).trim();
      continue;
    }

    // Skip other header lines
    if (line.startsWith('!')) continue;

    const code = line[0];
    const value = line.substring(1).trim();

    switch (code) {
      case 'D': // Date
        current.date = normalizeQifDate(value);
        break;
      case 'T': // Amount
      case 'U': // Amount (alternate)
        current.amount = parseFloat(value.replace(/[$,]/g, '')) || 0;
        break;
      case 'P': // Payee
        current.merchant = value;
        break;
      case 'M': // Memo
        current.memo = value;
        break;
      case 'L': // Category (may include subcategory like "Food:Groceries")
        current.category = value;
        break;
      case 'N': // Check number or reference
        current.checkNum = value;
        break;
      case 'C': // Cleared status
        current.clearedStatus = value;
        break;
      case '^': // End of record
        if (current.date && current.amount !== undefined) {
          transactions.push({
            date: current.date || '',
            amount: current.amount || 0,
            merchant: (current.merchant || current.memo || '').trim(),
            memo: (current.merchant ? (current.memo || '') : '').trim(),
            category: (current.category || '').replace(/:/g, ' > '), // subcategory separator
            checkNum: current.checkNum || '',
            clearedStatus: current.clearedStatus || '',
          });
        }
        current = {};
        break;
      // Skip split lines (S, $, E) and other codes
    }
  }

  // Handle last record if no trailing ^
  if (current.date && current.amount !== undefined) {
    transactions.push({
      date: current.date || '',
      amount: current.amount || 0,
      merchant: (current.merchant || current.memo || '').trim(),
      memo: (current.merchant ? (current.memo || '') : '').trim(),
      category: (current.category || '').replace(/:/g, ' > '),
      checkNum: current.checkNum || '',
      clearedStatus: current.clearedStatus || '',
    });
  }

  if (transactions.length === 0) {
    throw new Error('No transactions found. Please verify this is a valid QIF file.');
  }

  return { transactions, accountType };
}

/**
 * Normalize QIF date formats:
 *  - M/D/YY or M/D/YYYY or MM/DD/YY or MM/DD/YYYY
 *  - M-D-YY or M-D'YYYY (Quicken uses apostrophe for years 2000+)
 */
function normalizeQifDate(dateStr: string): string {
  if (!dateStr) return '';
  // Replace apostrophe used by Quicken for 2000s dates: 3/15'2026 → 3/15/2026
  const cleaned = dateStr.replace(/'/g, '/').replace(/-/g, '/').trim();

  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return dateStr;

  const month = match[1].padStart(2, '0');
  const day = match[2].padStart(2, '0');
  let year = match[3];
  if (year.length === 2) {
    year = (parseInt(year) > 50 ? '19' : '20') + year;
  }

  return `${year}-${month}-${day}`;
}
