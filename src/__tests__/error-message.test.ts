import { normalizeErrorMessage } from '@/shared/error-message';

describe('normalizeErrorMessage', () => {
  test('trims and collapses whitespace from Error messages', () => {
    expect(normalizeErrorMessage(new Error('  Unable to\n  load  routines.  '), 'Fallback.')).toBe(
      'Unable to load routines.',
    );
  });

  test('accepts thrown strings and uses the fallback for unusable errors', () => {
    expect(normalizeErrorMessage('  Try again later. ', 'Fallback.')).toBe('Try again later.');
    expect(normalizeErrorMessage(new Error('   '), 'Fallback.')).toBe('Fallback.');
    expect(normalizeErrorMessage({ message: 'Hidden error' }, 'Fallback.')).toBe('Fallback.');
  });
});
