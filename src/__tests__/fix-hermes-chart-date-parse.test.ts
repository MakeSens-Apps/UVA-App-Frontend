import { parseDateSafe } from '@/components/areachart/AreachartSvg';

/**
 * Device bug (2026-09-10): the historical chart rendered an empty container on
 * the Redmi Note 10S while working on Expo Web. Hermes returns NaN for
 * `new Date('2026/05/01')`, so every datum was filtered out. Labels are
 * `yyyy-MM-dd`; they must be parsed from their parts, never via Date.parse.
 */
describe('parseDateSafe (Hermes-safe)', () => {
  it('parses yyyy-MM-dd labels as local dates without Date.parse', () => {
    const d = parseDateSafe('2026-05-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(1);
    expect(isNaN(d.getTime())).toBe(false);
  });

  it('still accepts full ISO timestamps', () => {
    expect(isNaN(parseDateSafe('2026-05-01T10:00:00.000Z').getTime())).toBe(
      false,
    );
  });

  it('never depends on the slash format Hermes rejects', () => {
    const spy = jest.spyOn(global, 'Date');
    parseDateSafe('2026-05-31');
    const stringArgs = spy.mock.calls.filter((c) => typeof c[0] === 'string');
    expect(stringArgs).toHaveLength(0);
    spy.mockRestore();
  });
});
