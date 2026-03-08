// Smart merchant name extraction from generic bank descriptions + notes

// Generic merchant patterns that should trigger extraction from notes
const GENERIC_MERCHANT_PATTERNS = [
  /^withdrawal\s+debit\s+tran$/i,
  /^withdrawal\s+home\s+banking/i,
  /^withdrawal\s+bill\s+payment$/i,
  /^withdrawal\s+prog\s+direct/i,
  /^deposit\s+/i,
  /^withdrawal\s+/i,
  /\|merchant\s+purchase\s+ter/i,
  /^pos\s+(credit|debit)\s+purchase$/i,
  /^online\s+banking\s+transfer$/i,
  /^ach\s+(debit|credit)$/i,
  /^check\s+\d+$/i,
];

/**
 * Checks if a merchant name is a generic bank description that should be replaced
 */
export function isGenericMerchant(merchant: string): boolean {
  if (!merchant) return false;
  const trimmed = merchant.trim();
  return GENERIC_MERCHANT_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Extract a clean merchant name from a pipe-delimited merchant field
 * e.g., "LOVABLE|MERCHANT PURCHASE TER..." → "Lovable"
 */
function extractFromPipeMerchant(merchant: string): string | null {
  if (!merchant.includes('|')) return null;
  const before = merchant.split('|')[0].trim();
  if (before && before.length >= 2) return titleCase(before);
  return null;
}

/**
 * Extract merchant name from notes field
 * Handles patterns like: "MERCHANT_NAME CITY STATE Date MM/DD/YY..."
 * Also handles: "TYPE: xxx  ID: xxx CO: MERCHANT_NAME"
 */
function extractFromNotes(notes: string): string | null {
  if (!notes || notes.length < 3) return null;

  // Pattern 1: "OPC*MERCHANT..." → extract after OPC*
  const opcMatch = notes.match(/^OPC\*(.+?)(?:\s+\d|$)/i);
  if (opcMatch) return titleCase(opcMatch[1].trim());

  // Pattern 2: "CO: MERCHANT_NAME" (ACH transactions)
  const coMatch = notes.match(/CO:\s*(.+?)(?:\s*%%|\s*NAME:|\s*$)/i);
  if (coMatch) {
    const name = coMatch[1].trim().replace(/\s*\(.*\)$/, ''); // Remove trailing parentheticals
    if (name.length >= 2) return titleCase(name);
  }

  // Pattern 3: "MERCHANT CITY STATE Date MM/DD/YY..." (debit card transactions)
  // Extract everything before a US state abbreviation + "Date"
  const stateDate = notes.match(/^(.+?)\s+[A-Z]{2}\s+Date\s/i);
  if (stateDate) {
    let name = stateDate[1].trim();
    // Remove trailing city name (last word if it looks like a city)
    // The pattern is: MERCHANT_NAME CITY STATE Date
    // Remove the city (last word before state)
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      // Check if last part looks like a city (all caps, not a code)
      const lastPart = parts[parts.length - 1];
      if (lastPart === lastPart.toUpperCase() && lastPart.length >= 3 && !/[*#\d]/.test(lastPart)) {
        parts.pop(); // Remove city
      }
    }
    name = parts.join(' ');
    // Clean up merchant identifiers
    name = name.replace(/\s*MARK\*\s*.*/i, ''); // "AMAZON MARK* BE8ID1PB0" → "AMAZON"
    name = name.replace(/\s+#\d+/g, ''); // Remove store numbers like "#150"
    name = name.replace(/\s+\d{5,}/g, ''); // Remove long number sequences
    name = name.trim();
    if (name.length >= 2) return titleCase(name);
  }

  // Pattern 4: "To PERSON,NAME ACCOUNT_NUM..." (internal transfers)
  const toMatch = notes.match(/^To\s+(\w+),\s*(\w+)/i);
  if (toMatch) return `Transfer to ${titleCase(toMatch[2])} ${titleCase(toMatch[1])}`;

  // Pattern 5: Simple note — use first part before any numbers/codes
  const simple = notes.match(/^([A-Za-z][A-Za-z\s.&'-]+)/);
  if (simple && simple[1].trim().length >= 3) {
    const cleaned = simple[1].trim();
    if (cleaned.toLowerCase() !== 'pos credit purchase' && cleaned.toLowerCase() !== 'pos debit purchase') {
      return titleCase(cleaned);
    }
  }

  return null;
}

/**
 * Title-case a merchant name
 */
function titleCase(str: string): string {
  // Known brand casing
  const brands: Record<string, string> = {
    'amazon': 'Amazon',
    'netflix': 'Netflix',
    'lovable': 'Lovable',
    'spotify': 'Spotify',
    'starz': 'Starz',
    'hume ai': 'Hume AI',
    'aura.com': 'Aura',
    'wix.com': 'Wix',
    'clickfunnels.com': 'ClickFunnels',
    'creatify': 'Creatify',
    'x corp.': 'X Corp',
    'x corp': 'X Corp',
    'stash financial': 'Stash Financial',
    'stash capital': 'Stash Capital',
  };

  const lower = str.toLowerCase().trim();
  if (brands[lower]) return brands[lower];

  // Remove trailing dots
  const cleaned = str.replace(/\.+$/, '').trim();

  return cleaned
    .split(/\s+/)
    .map(word => {
      if (word.length <= 2 && word === word.toUpperCase()) return word; // Keep short caps like "AI"
      if (word.includes('.')) return word; // Keep domain names
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Smart merchant extraction: given a merchant field and notes field,
 * return the best merchant name.
 */
export function extractSmartMerchant(merchant: string, notes: string): string {
  const trimmedMerchant = (merchant || '').trim();

  // First: try pipe-delimited extraction (e.g., "LOVABLE|MERCHANT PURCHASE TER...")
  const pipeResult = extractFromPipeMerchant(trimmedMerchant);
  if (pipeResult) return pipeResult;

  // If merchant is generic, try to extract from notes
  if (isGenericMerchant(trimmedMerchant)) {
    const notesResult = extractFromNotes(notes);
    if (notesResult) return notesResult;
  }

  // For "Deposit COMPANY_NAME" or "Withdrawal COMPANY_NAME" patterns
  const depositMatch = trimmedMerchant.match(/^(?:Deposit|Withdrawal)\s+(.{3,})/i);
  if (depositMatch) {
    const name = depositMatch[1].trim();
    // Only use if it's not another generic suffix
    if (!/^(debit|credit|home|bill|ach|check)\b/i.test(name)) {
      return titleCase(name);
    }
    // Try notes for these
    const notesResult = extractFromNotes(notes);
    if (notesResult) return notesResult;
  }

  return trimmedMerchant || 'Unknown';
}
