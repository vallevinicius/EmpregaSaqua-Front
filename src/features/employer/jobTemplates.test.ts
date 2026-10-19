import { describe, expect, it } from 'vitest';
import { JOB_TEMPLATES } from './jobTemplates';

/** Modelos precisam passar nos limites do back (CreateJobDto), senão o botão "Publicar" falharia depois de usar um modelo. */
describe('modelos de vaga', () => {
  it.each(JOB_TEMPLATES.map((t) => [t.name, t] as const))('%s respeita os limites do back', (_n, t) => {
    expect(t.title.length).toBeLessThanOrEqual(150);
    expect(t.description.length).toBeGreaterThanOrEqual(20);
    expect(t.description.length).toBeLessThanOrEqual(3000);
    expect(t.work_schedule.length).toBeLessThanOrEqual(100);
    for (const list of [t.mandatory_qualifications, t.differential_qualifications, t.benefits]) {
      expect(list.length).toBeLessThanOrEqual(20);
      list.forEach((i) => expect(i.length).toBeLessThanOrEqual(150));
    }
  });
});
