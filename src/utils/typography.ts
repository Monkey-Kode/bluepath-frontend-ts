import Typography from 'typography';
const typography = new Typography({
  baseFontSize: '16px',
  baseLineHeight: 1.666,
  headerFontFamily: ['Libre Baskerville', 'Georgia', 'serif'],
  bodyFontFamily: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
});
export const typographyStyles = typography.toString();
export default typography;
