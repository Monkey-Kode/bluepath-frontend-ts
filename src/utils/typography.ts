import Typography from 'typography';
const typography = new Typography({
  baseFontSize: '18px',
  baseLineHeight: 1.666,
  headerFontFamily: ['Roboto', 'Helvetica', 'Arial', 'sans-serif'],
  bodyFontFamily: ['Roboto', 'Helvetica', 'Arial', 'sans-serif'],
});
export const typographyStyles = typography.toString();
export default typography;
