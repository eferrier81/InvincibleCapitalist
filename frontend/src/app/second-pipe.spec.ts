import { SecondPipe } from './second-pipe';

describe('SecondPipe', () => {
  const pipe = new SecondPipe();

  it('formats sub-minute durations as seconds.tenths', () => {
    expect(pipe.transform(4500)).toBe('4.5s');
  });

  it('formats durations with minutes', () => {
    expect(pipe.transform(65000)).toBe('1:05.0');
  });

  it('formats durations with hours', () => {
    expect(pipe.transform(3661000)).toBe('1:01:01');
  });

  it('handles zero/negative/null gracefully', () => {
    expect(pipe.transform(0)).toBe('0.0s');
    expect(pipe.transform(null)).toBe('0.0s');
  });
});
