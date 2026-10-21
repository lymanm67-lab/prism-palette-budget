import { AKRON_FIELDS } from './fields';
import type { AkronAnswers } from './pdf';

export function createAkronDraft(answers: AkronAnswers, page: number) {
  return JSON.stringify({ application: 'akron-dreams-2026', version: 1, page, answers });
}

export function readAkronDraft(text: string): { answers: AkronAnswers; page: number } {
  const invalid = () => new Error('This is not a valid Akron Dreams saved draft.');
  if (text.length > 10_000_000) throw invalid();
  const draft = JSON.parse(text);
  if (!draft || draft.application !== 'akron-dreams-2026' || draft.version !== 1 ||
    !Number.isInteger(draft.page) || draft.page < 1 || draft.page > 9 ||
    !draft.answers || typeof draft.answers !== 'object' || Array.isArray(draft.answers)) throw invalid();
  const fields = new Map(AKRON_FIELDS.map((f) => [f.id, f]));
  const answers: AkronAnswers = {};
  for (const [id, value] of Object.entries(draft.answers)) {
    const field = fields.get(id);
    if (!field) throw invalid();
    if (field.kind === 'checkbox') {
      if (typeof value !== 'boolean') throw invalid();
    } else {
      if (typeof value !== 'string' || value.length > (field.kind === 'signature' ? 1_000_000 : 20_000)) throw invalid();
      if (field.kind === 'signature' && value && !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw invalid();
    }
    answers[id] = value as string | boolean;
  }
  return { answers, page: draft.page };
}