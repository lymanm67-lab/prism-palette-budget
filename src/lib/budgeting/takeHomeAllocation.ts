/** These items do not consume deposited net pay, regardless of purpose overrides. */
export function excludesTakeHomeAllocation(name: string, payroll: boolean, transfer = false): boolean {
  return payroll || transfer || /^(internal\s+)?transfers?$/i.test(name.trim()) ||
    /^Investment Transfer\s*[—–-]\s*Business Checking$/i.test(name.trim()) ||
    /grocer|medical|pharmacy|prescription|doctor/i.test(name);
}