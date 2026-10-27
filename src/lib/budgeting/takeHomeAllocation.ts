/** These items do not consume deposited net pay, regardless of purpose overrides. */
export function excludesTakeHomeAllocation(name: string, payroll: boolean, transfer = false): boolean {
  return payroll || transfer || /^(internal\s+)?transfers?$/i.test(name.trim()) ||
    /grocer|medical|pharmacy|prescription|doctor/i.test(name);
}

/** Investment transfers remain allocated wealth, but are not business operating costs. */
export function excludesBusinessOperatingFunding(name: string): boolean {
  return excludesTakeHomeAllocation(name, false) ||
    /^Investment Transfer\s*[—–-]\s*Business Checking$/i.test(name.trim());
}