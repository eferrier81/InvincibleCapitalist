import { BigvaluePipe } from './bigvalue-pipe';

describe('BigvaluePipe', () => {
  const pipe = new BigvaluePipe();

  it('formats small numbers with two decimals', () => {
    expect(pipe.transform(12.3456)).toBe('12.35');
  });

  it('formats mid-range numbers as integers', () => {
    expect(pipe.transform(123456)).toBe('123456');
  });

  it('formats large numbers in scientific notation', () => {
    expect(pipe.transform(12345678)).toContain('10<sup>');
  });

  it('handles null/undefined gracefully', () => {
    expect(pipe.transform(null)).toBe('0');
    expect(pipe.transform(undefined)).toBe('0');
  });
});
