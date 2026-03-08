// OFX/QBO/QFX parser — handles Open Financial Exchange format
// QBO = Quicken for Business (OFX variant), QFX = Quicken Financial Exchange (OFX variant)

export interface OfxTransaction {
  date: string;       // YYYY-MM-DD
  amount: number;
  merchant: string;
  memo: string;
  fitId: string;      // Financial Institution Transaction ID (for dedup)
  type: string;       // DEBIT, CREDIT, etc.
}

export interface OfxParseResult {
  transactions: OfxTransaction[];
  accountId: string;
  accountType: string;
  bankId: string;
  currency: string;
  fileType: 'ofx' | 'qbo' | 'qfx';
}

/**
 * Parse OFX/QBO/QFX file content into structured transactions.
 * These formats use SGML-like markup (not strict XML).
 */
export function parseOfxText(text: string, fileType: 'ofx' | 'qbo' | 'qfx'): OfxParseResult {
  // Strip XML/SGML headers and normalize
  const content = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const transactions: OfxTransaction[] = [];

  // Extract all STMTTRN blocks
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>))/gi;
  let match: RegExpExecArray | null;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1];
    const txn = parseTransaction(block);
    if (txn) transactions.push(txn);
  }

  if (transactions.length === 0) {
    throw new Error('No transactions found in the file. Please verify this is a valid OFX/QBO/QFX file.');
  }

  // Extract account info
  const accountId = extractTag(content, 'ACCTID') || '';
  const accountType = extractTag(content, 'ACCTTYPE') || '';
  const bankId = extractTag(content, 'BANKID') || '';
  const currency = extractTag(content, 'CURDEF') || 'USD';

  return {
    transactions,
    accountId,
    accountType,
    bankId,
    currency,
    fileType,
  };
}

function parseTransaction(block: string): OfxTransaction | null {
  const type = extractTag(block, 'TRNTYPE') || '';
  const dateRaw = extractTag(block, 'DTPOSTED') || '';
  const amountRaw = extractTag(block, 'TRNAMT') || '';
  const fitId = extractTag(block, 'FITID') || '';
  const name = extractTag(block, 'NAME') || '';
  const memo = extractTag(block, 'MEMO') || '';

  const amount = parseFloat(amountRaw);
  if (isNaN(amount)) return null;

  const date = parseOfxDate(dateRaw);
  if (!date) return null;

  // Use NAME as merchant, fall back to MEMO
  const merchant = name || memo;

  return {
    date,
    amount,
    merchant: merchant.trim(),
    memo: (name ? memo : '').trim(),
    fitId,
    type: type.toUpperCase(),
  };
}

/**
 * Extract a tag value from OFX SGML content.
 * OFX uses <TAG>value format (no closing tags for leaf elements in SGML mode).
 */
function extractTag(content: string, tag: string): string | null {
  // Try with closing tag first (XML-style): <TAG>value</TAG>
  const xmlRegex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const xmlMatch = content.match(xmlRegex);
  if (xmlMatch) return xmlMatch[1].trim();

  // SGML-style: <TAG>value\n
  const sgmlRegex = new RegExp(`<${tag}>([^\\n<]+)`, 'i');
  const sgmlMatch = content.match(sgmlRegex);
  if (sgmlMatch) return sgmlMatch[1].trim();

  return null;
}

/**
 * Parse OFX date format: YYYYMMDDHHMMSS[.XXX:Z] or YYYYMMDD
 */
function parseOfxDate(dateStr: string): string | null {
  if (!dateStr) return null;
  // Take first 8 chars: YYYYMMDD
  const cleaned = dateStr.replace(/[[\]]/g, '').trim();
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  
  const year = match[1];
  const month = match[2];
  const day = match[3];
  
  // Validate
  const m = parseInt(month);
  const d = parseInt(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  
  return `${year}-${month}-${day}`;
}

/**
 * Detect file type from extension
 */
export function detectFinancialFileType(filename: string): 'csv' | 'ofx' | 'qbo' | 'qfx' | null {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'csv': return 'csv';
    case 'ofx': return 'ofx';
    case 'qbo': return 'qbo';
    case 'qfx': return 'qfx';
    default: return null;
  }
}
