// *** This file content is being moved to src\utils\ColorsUtils.ts ***

/** BG Colors */
export const firstGroup = "#E0F2FE";  // $color-bluelight-100
export const secondGroup = "#FECDD6";  // $color-rose-200
export const thirdGroup = "#FDEAD7";  // $color-orange-100
export const fourthGroup = "#CCFBEF";  // $color-teal-100

/** Fonts colors */
export const fontFirstGroup = "#026AA2";  // $color-bluelight-700
export const fontSecondGroup = "#C01048";  // $color-rose-700
export const fontThirdGroup = "#B54708";  // $color-warning-700
export const fontFourthGroup = "#107569";  // $color-teal-700

//Multiple Groups
export const multipleGroups = "#98a2b3"

/** Kendo Chart Colors */ 
export const chartFirstGroup = "#2e90fa";  // $color-blue-500
export const chartSecondGroup = "#36BFFA";  // $color-bluelight-400
export const chartThirdGroup = "#FF4405";  // $color-orange-dark
export const chartFourthGroup = "#FFB524";  // $color-sun-yellow
export const chartFifthGroup = "#0E9384";  // $color-teal-600

export const restColor = "#98A2B3"; // $color-gray-400
export const chartPieExcludedColor = "#475467";

/** 
 * Level Colors
 */

export const veryLow: string = "#4A5578";  // $color-coolgray-600
export const low: string = "#FF4405";  // $color-orangedark-500
export const medium: string = "#FFB524";  // $color-sun-yellow 
export const high: string = "#66C61C";  // $color-green-light
export const veryHigh: string = "#0E9384";  // $color-teal-600

/** No Level */
export const noLevel: string = "#EBECF0";  // $color-gray-200
export const noLevelText: string = "#98A2B3";  // $color-gray-400

/** Colors for Phases  */
export const summary = "#717BBC";  // $color-grayblue-400
export const p1 = "#FAC515";  // $color-yellow-400
export const p2 = "#15B79E";  // $color-teal-500
export const p3 = "#FF2C4F";  // $color-primary-500

/** colors for waterfall */

export const totalWaterfall = "#4A5578" // $color-coolgray-600
export const actualPaymentTerms = "#22ccee"
export const supplierStandard = "#0040C1" // $color-blue-dark-800
export const defaultColor = "#2E90FA" // $color-blue-500
export const color222222 = "#222222"
export const negativeColorForStrategies = "#98A2B3" // $color-gray-400

export const currentCompany = '#344054'


/**
 * google map
 */

export const oceanBgColor = "#fcfcfd"
export const landBgColor = "#eaecf0"

/**
 * Avatar background color per letter of the alphabet (A–Z).
 * Used to assign a consistent color to avatars based on the first letter of last name.
 * Cycles through 6 curated colors: Teal · Indigo · Coral · Emerald · Violet · Amber.
 */
export const AVATAR_COLORS_BY_LETTER: readonly string[] = [
  '#4ECDC4', '#6C5CE7', '#E17055', '#00B894', '#A78BFA', '#F59E0B', // A–F
  '#4ECDC4', '#6C5CE7', '#E17055', '#00B894', '#A78BFA', '#F59E0B', // G–L
  '#4ECDC4', '#6C5CE7', '#E17055', '#00B894', '#A78BFA', '#F59E0B', // M–R
  '#4ECDC4', '#6C5CE7', '#E17055', '#00B894', '#A78BFA', '#F59E0B', // S–X
  '#4ECDC4', '#6C5CE7',                                              // Y–Z
];

/** Default avatar color when last name is empty or letter is not A–Z */
export const AVATAR_COLOR_DEFAULT = '#98A2B3';
