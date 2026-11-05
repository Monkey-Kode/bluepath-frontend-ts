import { describe, expect, it } from 'vitest';
import { stateName } from './extractState';

describe('stateName', () => {
  it.each([
    ['MA', 'Massachusetts'],
    ['ma', 'Massachusetts'],
    [' Massachusetts ', 'Massachusetts'],
    ['new  york', 'New York'],
    ['DC', 'District of Columbia'],
    ['Ontario', 'Ontario'],
  ])('reads %j as %j', (value, name) => {
    expect(stateName(value)).toBe(name);
  });

  it.each([null, undefined, '', '  '])('gives no state for %j', (value) => {
    expect(stateName(value)).toBeNull();
  });
});
