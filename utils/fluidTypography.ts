/**
 * @desc Styled components mixin for fluid typography - https://www.youtube.com/watch?v=Wb5xDcUNq48
 * @param string minScreen - min screen width
 * @param string maxScreen - max screen width
 * @param string minFont - min font size
 * @param string maxFont - max font size
 * @return string - Template literal containing CSS
 */

function fluidType(
  minScreen: string,
  maxScreen: string,
  minFont: string,
  maxFont: string
) {
  return `
      font-size: calc(${minFont} + (${
    parseInt(maxFont) - parseInt(minFont)
  }) * (100vw - ${minScreen})/(${parseInt(maxScreen) - parseInt(minScreen)}));
    `;
}

export default fluidType;
