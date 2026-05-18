import { css } from 'styled-components';

/**
 * Top padding that clears the fixed Header. The Header component sets
 * `--header-height` on document.documentElement via ResizeObserver, so this
 * adapts to nav-line wraps on smaller screens.
 */
export const headerOffset = css`
  padding-top: calc(var(--header-height, 100px) + 1.5rem);
`;

export const hexagonGridItem = (rows: number, amount: number) => {
  let styles = '';
  for (let i = 1; i <= amount; i++) {
    styles += `
        &:nth-of-type(${amount}n + ${i}) {
            grid-column: ${i + i - 1}/span 3;
            ${
              i % 2 === 0
                ? `grid-row: calc(var(--counter) + var(--counter) - 1)/span 2;`
                : ''
            }

        }

    `;
  }
  for (let i = 1; i <= rows; i++) {
    styles += `
        &:nth-of-type(n + ${i * amount + 1}) {
            --counter: ${i + i};
        }
    `;
  }
  return styles;
};
