import { describe, expect, it } from 'vitest';
import { createAkronDraft, readAkronDraft } from './draft';
import { AKRON_FIELDS } from './fields';

describe('Akron device drafts', () => {
  it('restores entered answers, checklist, signature and current page', () => {
    const checkbox = AKRON_FIELDS.find((f) => f.kind === 'checkbox');
    const signature = AKRON_FIELDS.find((f) => f.kind === 'signature');
    if (!checkbox || !signature) throw new Error('Missing application fields');
    const answers = { applicant_name: 'Practice Applicant', coapplicant_name: 'Practice Partner', [checkbox.id]: true, [signature.id]: 'data:image/png;base64,aW5r' };
    expect(readAkronDraft(createAkronDraft(answers, 8))).toEqual({ answers, page: 8 });
  });
  it('rejects unrelated files and invalid pages', () => {
    expect(() => readAkronDraft('{}')).toThrow();
    expect(() => readAkronDraft(createAkronDraft({}, 10))).toThrow();
  });
  it('rejects unknown fields and wrong answer types', () => {
    expect(() => readAkronDraft(createAkronDraft({ unknown: 'value' }, 3))).toThrow();
    expect(() => readAkronDraft(createAkronDraft({ applicant_name: true }, 3))).toThrow();
  });
  it('rejects non-PNG signature sources', () => {
    const signature = AKRON_FIELDS.find((f) => f.kind === 'signature');
    if (!signature) throw new Error('Missing signature');
    expect(() => readAkronDraft(createAkronDraft({ [signature.id]: 'https://example.test/image' }, 2))).toThrow();
  });
});