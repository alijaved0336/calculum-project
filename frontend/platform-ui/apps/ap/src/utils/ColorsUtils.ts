export default class ColorsUtils {
  // Colors that can't be used via css

  /**
   * How to use:
   * example: c = ColorsUtils.blue[500];
   */
  static readonly blue = {
    300: "#84caff",
    500: "#2e90fa"
  };

  static readonly bluelight = {
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
    900: "#0b4a6f"
  };

  static readonly blueDark = {
    25: "#eff4ff",
    50: "#eff4ff",
    100: "#d1e0ff",
    200: "#b2ccff",
    300: "#84adff",
    400: "#528bff",
    500: "#2970ff",
    600: "#004eeb",
    700: "#004eeb", // ? - Same as 600
    800: "#0040c1",
    900: "#00359e"
  };

  static readonly cyan = {
    400 : "#22ccee",
    500: "#06aed4"
  };

  static readonly gray = {
    300: "#d0d5dd",
    400: "#98a2b3",
    600: "#4a5567"
  };

  static readonly graycool = {
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
    900: "#111322"
  };

  static readonly indigo = {
    100: "#eef4ff",
    200: "#c7d7fe",
    500: "#6172F3",
    700: "#3538cd",
    800: "#2d31a6"
  };

  static readonly orange = {
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
    900: "#772917"
  };

  static readonly red = {
    500: "#f04438"
  };

  static readonly primary = {
    25: "#fff5f6",
    50: "#fff3f5",
    100: "#ffdfe4",
    200: "#ffcbd4",
    300: "#ffa3b3",
    400: "#ff5470",
    500: "#ff2c4f",
    600: "#e02343",
    700: "#c11a36",
    800: "#c11a36", // Same color as $color-primary-700
    900: "#c11a36" // Same color as $color-primary-700
  };

  static readonly teal = {
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
    900: "#134e48"
  };

  static readonly violet = {
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
    900: "#491c96"
  };

  static readonly yellow = {
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
    900: "#713b12"
  };

  // SME
  static readonly sme = this.yellow[400];
}
