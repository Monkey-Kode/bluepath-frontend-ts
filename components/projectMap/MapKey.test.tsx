import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SHADES } from '@/lib/mapProjects/shading';
import MapKey from './MapKey';

describe('MapKey (FR-003, AC-2.2)', () => {
  it("colors its title with the legend's text color", () => {
    // tailwind-merge reads the theme's text-micro size as a color, so the color sits apart.
    render(<MapKey />);
    expect(screen.getByText('Plants per state')).toHaveClass('text-legend');
  });

  it('runs the map shades from the "1" end to the "100" end', () => {
    const { container } = render(<MapKey />);
    expect(screen.getByText('Plants per state')).toBeVisible();

    const steps = [...container.querySelectorAll('span[style]')];
    expect(steps).toHaveLength(SHADES.length);
    for (const [i, step] of steps.entries()) {
      expect(step).toHaveStyle({ backgroundColor: SHADES[i].color });
    }

    const [first, last] = [screen.getByText('1'), screen.getByText('100')];
    const bar = steps[0].parentElement as Element;
    const before = Node.DOCUMENT_POSITION_PRECEDING;
    expect(bar.compareDocumentPosition(first) & before).toBeTruthy();
    expect(last.compareDocumentPosition(bar) & before).toBeTruthy();
  });
});
