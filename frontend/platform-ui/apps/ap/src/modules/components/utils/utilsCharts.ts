import { ColorsUtils } from "@/utils";

export const getRandomNumberSafer = (): number => {
  const randomArray = new Uint32Array(1);
  window.crypto.getRandomValues(randomArray); // Generate a random number using crypto
  const randomNumber=randomArray[0] / 4294967296 
  return randomNumber;
}

export const reasonForExclusionEntitiesUtils = (
  selectecMetric: string,
  arrayData: any,
) => {
  switch (selectecMetric) {
    case "numberOfSuppliers":
      return arrayData.numberOfSuppliers ?? [];
    case "numberOfSpends":
      return arrayData.numberOfSpends ?? [];
    case "spendVolume":
      return arrayData.spendVolume ?? [];
  }
};

export function getRandomHexColor(): string {
  const assignedColors = new Set<string>();
  let color = "";
  do {
    color = `#${Math.floor(getRandomNumberSafer() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    // Ensure color is not too light (sum of RGB > 150) and not already assigned
    if (r + g + b > 150 && !assignedColors.has(color)) {
      break;
    }
  } while (true);
  assignedColors.add(color);
  return color;
}

export const colors = {
  black: {
    0: "#000000",
  },
  blue: {
    400: "#36bffa",
    500: "#2e90fa",
  },
  bluelight: {
    25: "#f5fbff",
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#b9e6fe",
    300: "#7cd4fd",
    400: "#36bffa",
    500: "#0ba5ec",
    600: "#0086c9",
    700: "#026aa2",
    800: "#065986",
    900: "#0b4a6f",
  },
  gray: {
    25: "#fcfcfd",
    50: "#f9fafb",
    100: "#f2f4f7",
    200: "#eaecf0",
    300: "#d0d5dd",
    400: "#98a2b3",
    500: "#667085",
    600: "#4a5567",
    700: "#344054",
    800: "#1d2939",
    900: "#101828",
  },
  graycool: {
    25: "#fcfcfd",
    50: "#f9fafb",
    100: "#eff1f5",
    200: "#dcdfea",
    300: "#b9c0d4",
    400: "#7d89b0",
    500: "#5d6b98",
    600: "#4a5578",
    700: "#404968",
    800: "#30374f",
    900: "#111322",
  },
  greenlight: {
    50: "#f3fee7",
    500: "#66c61c",
    600: "#4ca30d",
  },
  indigo: {
    100: "#eef4ff",
    200: "#c7d7fe",
    500: "#6172F3",
    700: "#3538cd",
    800: "#2d31a6",
  },
  orange: {
    25: "#fefaf5",
    50: "#fef6ee",
    100: "#fdead7",
    200: "#f9dbaf",
    300: "#f7b27a",
    400: "#f38744",
    500: "#ff4405",
    600: "#e04f16",
    700: "#b93815",
    800: "#932f19",
    900: "#772917",
  },
  primary: {
    25: "#fff5f6",
    50: "#fff3f5",
    100: "#ffdfe4",
    200: "#ffcbd4",
    300: "#ffa3b3",
    400: "#ff5470",
    500: "#ff2c4f",
    600: "#e02343",
    700: "#c11a36",
    800: "#c11a36",
    900: "#c11a36",
  },
  violet: {
    25: "#fbfaff",
    50: "#f5f3ff",
    100: "#ece9fe",
    200: "#ddd6fe",
    300: "#c3b5fd",
    400: "#a48afb",
    500: "#875bf7",
    600: "#7839ee",
    700: "#6927da",
    800: "#5720b7",
    900: "#491c96",
  },
  teal: {
    25: "#f6fefc",
    50: "#f0fdf9",
    100: "#ccfbef",
    200: "#99f6e0",
    300: "#5fe9d0",
    400: "#2ed3b7",
    500: "#15b79e",
    600: "#0e9384",
    700: "#107569",
    800: "#125d56",
    900: "#134e48",
  },
  rose: {
    25: "#fff5f6",
    50: "#fff1f3",
    100: "#fce7f6",
    200: "#fecdd6",
    300: "#fea3b4",
    400: "#fd6f8e",
    500: "#f63d68",
    600: "#e31b54",
    700: "#c01048",
    800: "#a11043",
    900: "#89123e",
  },
  success: {
    25: "#f6fef9",
    50: "#ecfdf3",
    100: "#d1fadf",
    200: "#a6f4c5",
    300: "#6ce9a6",
    400: "#32d583",
    500: "#12b76a",
    600: "#039855",
    700: "#027a48",
    800: "#05603a",
    900: "#054f31",
  },
  white: {
    0: "#ffffff",
  },
  yellow: {
    25: "#fefdf0",
    50: "#fefbe8",
    100: "#fef7c3",
    200: "#feee95",
    300: "#fde272",
    400: "#fac515",
    500: "#eaaa08",
    600: "#ca8504",
    700: "#a15c07",
    800: "#854a0e",
    900: "#713b12",
  },
};

// Function to get a random color from any group
export function getRandomColor(): string {
  const colorGroups = Object.values(colors);
  const randomGroup =
    colorGroups[Math.floor(getRandomNumberSafer() * colorGroups.length)];
  const shades = Object.values(randomGroup);
  return shades[Math.floor(getRandomNumberSafer() * shades.length)];
}
// Function to get all colors in a specific group
export function getColorGroup(
  group: keyof typeof colors,
): Record<string, string> | null {
  return colors[group] || null;
}

export function getRandomColorFromGroups(
  groups: Array<keyof typeof colors>,
): string {
// We filter the valid groups (that exist in our colors object)
  const validGroups = groups.filter((group) => group in colors);

  if (validGroups.length === 0) {
    // If there are no valid groups, we return a random color from any group
    const allGroups = Object.keys(colors) as Array<keyof typeof colors>;
    const randomGroup = allGroups[Math.floor(getRandomNumberSafer() * allGroups.length)];
    const shades = Object.values(colors[randomGroup]);
    return shades[Math.floor(getRandomNumberSafer() * shades.length)];
  }

  const randomGroup =
    validGroups[Math.floor(getRandomNumberSafer() * validGroups.length)];

  const groupShades = Object.values(colors[randomGroup]);

  return groupShades[Math.floor(getRandomNumberSafer() * groupShades.length)];
}

export type ColorPreference = "light" | "dark" | "any";

export function getRandomColorFromGroupsPreference(
  groups: Array<keyof typeof colors>,
  preference: ColorPreference = "any",
  weight?: number, // Opcional: peso para preferencia (0-1)
): string {
  const validGroups = groups.filter((group) => group in colors);

  if (validGroups.length === 0) {
    validGroups.push(...(Object.keys(colors) as Array<keyof typeof colors>));
  }

  const randomGroup =
    validGroups[Math.floor(getRandomNumberSafer() * validGroups.length)];
  const groupColors = colors[randomGroup];

  let colorOptions = Object.entries(groupColors).map(([shade, color]) => ({
    shade: parseInt(shade) || 0,
    color,
  }));

  if (preference !== "any") {
    colorOptions = colorOptions.filter((option) => {
      const lightness = getColorLightness(option.color);
      // We apply weight if it is defined (0.5 = neutral, <0.5 towards light, >0.5 towards dark)
      const threshold = weight !== undefined ? weight : 0.5;
      return preference === "light"
        ? lightness > threshold
        : lightness < threshold;
    });

    if (colorOptions.length === 0) {
      colorOptions = Object.entries(groupColors).map(([shade, color]) => ({
        shade: parseInt(shade) || 0,
        color,
      }));
    }
  }

  const randomColor =
    colorOptions[Math.floor(getRandomNumberSafer() * colorOptions.length)].color;
  return randomColor;
}

function getColorLightness(hexColor: string): number {
  // Convert HEX to RGB
  const r = parseInt(hexColor.substr(1, 2), 16) / 255;
  const g = parseInt(hexColor.substr(3, 2), 16) / 255;
  const b = parseInt(hexColor.substr(5, 2), 16) / 255;

  // Perceptual luminosity formula
  return 0.299 * r + 0.587 * g + 0.114 * b;
}


export function getRandomAlternatingColors(
  groups: Array<keyof typeof colors>,
  count: number
): string[] {
  const { lightColors, darkColors, midColors } = classifyColors(groups);

  const maxPossible = Math.min(lightColors.length, darkColors.length) * 2;
  if (maxPossible < count) {
    console.warn(
      `No hay suficientes colores para alternar perfectamente. Máximo posible: ${Math.min(
        maxPossible,
        lightColors.length + darkColors.length + midColors.length
      )}`
    );
    count = Math.min(maxPossible, lightColors.length + darkColors.length + midColors.length);
  }

  const selectedColors: string[] = [];
  let preferLight = getRandomNumberSafer() > 0.5; 

  const lightPool = [...lightColors];
  const darkPool = [...darkColors];
  const midPool = [...midColors];

  while (selectedColors.length < count) {
    if (preferLight && lightPool.length > 0) {
      addRandomColor(lightPool);
    } else if (!preferLight && darkPool.length > 0) {
      addRandomColor(darkPool);
    } else if (midPool.length > 0) {
      addRandomColor(midPool);
    } else {
      break;
    }

    preferLight = !preferLight;
  }

  function addRandomColor(pool: string[]) {
    const randomIndex = Math.floor(getRandomNumberSafer() * pool.length);
    selectedColors.push(pool[randomIndex]);
    pool.splice(randomIndex, 1);
  }

  return selectedColors;
}

function classifyColors(groups: Array<keyof typeof colors>) {
  const lightColors: string[] = []; // 0.6 < luminancia ≤ 0.85
  const darkColors: string[] = [];  // luminancia ≤ 0.4
  const midColors: string[] = [];   // 0.4 < luminancia ≤ 0.6

  groups.forEach(group => {
    const groupColors = colors[group];
    if (groupColors) {
      Object.values(groupColors).forEach(color => {
        // Exclude pure black and white
        if (color === "#FFFFFF" || color === "#000000") return;
        
        const lum = getLuminance(color);
        
        if (lum > 0.85) return; // Exclude near-white colors
        else if (lum > 0.3) lightColors.push(color);
        else if (lum <= 0.80) darkColors.push(color);
        else midColors.push(color);
      });
    }
  });

  return {
    lightColors: [...new Set(lightColors)],
    darkColors: [...new Set(darkColors)],
    midColors: [...new Set(midColors)]
  };
}

function getLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Fórmula WCAG 2.0
  return 0.2126 * (r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)) +
         0.7152 * (g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)) +
         0.0722 * (b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4));
}

export function getStrictDarkColors(
  groups: Array<keyof typeof colors>,
  count: number
): string[] {
  const eligibleColors: string[] = [];

  groups.forEach(group => {
    const groupColors = colors[group];
    if (groupColors) {
      Object.entries(groupColors).forEach(([shade, color]) => {
        const shadeNumber = parseInt(shade);
        if (shadeNumber >= 400) {
          eligibleColors.push(color);
        }
      });
    }
  });

  const uniqueColors = [...new Set(eligibleColors)];

  if (uniqueColors.length < count) {
    console.warn(
      `Solo hay ${uniqueColors.length} colores disponibles con nivel ≥400. ` +
      `Solicitaste ${count}. Se devolverán todos los disponibles.`
    );
    count = uniqueColors.length;
  }

  const selectedColors: string[] = [];
  const availableColors = [...uniqueColors];

  while (selectedColors.length < count && availableColors.length > 0) {
    const randomIndex = Math.floor(getRandomNumberSafer() * availableColors.length);
    selectedColors.push(availableColors[randomIndex]);
    availableColors.splice(randomIndex, 1);
  }

  return selectedColors;
}


export function chartsGetItemColorMatch(key: string): string {
  const normalized = (key ?? "").toString().trim().toLowerCase();

  switch (normalized) {
    case "include":
    case "included":
      return ColorsUtils.blue[500];

    case "exclude":
    case "excluded":
      return ColorsUtils.graycool[600];

    case "matched":
      return ColorsUtils.bluelight[400];

    case "unmatched":
      return ColorsUtils.gray[400];

    // Generic "others" slices (e.g. market share remainder)
    case "others":
      return ColorsUtils.gray[400];

    default:
      return "";
  }
}