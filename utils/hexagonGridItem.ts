/**
 * Generates the nth-of-type column/row CSS rules for the impact-hexagon
 * honeycomb grid. Originally lived in `styles/mixins.ts` as a
 * styled-components helper; rewritten to return a raw CSS string so it
 * can be injected as a static <style> tag from the component.
 *
 * @param rows   number of full rows of staggered hexagons
 * @param amount number of hexagons per row
 */
export function hexagonGridItem(rows: number, amount: number): string {
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
}
