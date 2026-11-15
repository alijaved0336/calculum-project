export { default as CalculumLoading } from "./components/CalculumLoading.vue";
export { default as CalculumLoadingAr } from "./components/CalculumLoadingAr.vue";
export { default as CalculumLayout } from "./components/CalculumLayout.vue";
export { default as CalculumFullScreen } from "./components/CalculumFullScreen.vue";
export { default as SearchableDropdown } from "./components/SearchableDropdown.vue";
export { default as SwitchPlatforms } from "./components/SwitchPlatforms.vue";
export { default as BarsWrapper } from "./components/BarsWrapper.vue";
export { default as BarsComponent } from "./components/BarsComponent.vue";
export { default as ChartHorizontalSingleBar } from "./components/charts/ChartHorizontalSingleBar.vue";
export { default as LevelDashesChart } from "./components/charts/LevelDashesChart.vue";
export { default as BigNumberTwoIdenticalCol } from "./components/cards/BigNumberTwoIdenticalCol.vue";
export { default as BigNumberTwoCol } from "./components/cards/BigNumberTwoCol.vue";
export { default as BigNumberThreeCols } from "./components/cards/BigNumberThreeCols.vue";
export { ContentBox, ContentBoxBody } from "./components/content-box";
export { OverviewDataQualityAndRequired } from "./components/data-quality-and-required";
export type { DataQualityAndRequiredData } from "./components/data-quality-and-required";
export { CustomTabs } from "./components/custom-tabs";
export type { TabItem, TabsAppearance } from "./components/custom-tabs";
export { TABS_APPEARANCES } from "./components/custom-tabs";
export { NoDataAvailable } from "./components/no-data-available";
export { StatusCard } from "./components/status-card";
export type { StatusCardVariant, StatusCardItem } from "./components/status-card";
export { STATUS_CARD_VARIANTS } from "./components/status-card";
export { NewsCard } from "./components/news-card";
export type { NewsCardProps } from "./components/news-card";
export { SupplierCard } from "./components/supplier-card";
export type {
  SupplierCardProps,
  SupplierCardSupplierItem,
  SupplierCardAccentKind,
  SupplierCardType,
} from "./components/supplier-card";
export {
  SUPPLIER_CARD_ACCENTS,
  SUPPLIER_CARD_TYPES,
  SUPPLIER_CARD_DEFAULT_LABELS,
  resolveSupplierCardAccentKind,
} from "./components/supplier-card";
export { SupplierCardSlider } from "./components/supplier-card-slider";
export type {
  SupplierCardSliderProps,
  SupplierCardSliderItemSlot,
} from "./components/supplier-card-slider";
export {
  SUPPLIER_CARD_SLIDER_DEFAULT_SLIDES_PER_VIEW,
  SUPPLIER_CARD_SLIDER_DEFAULT_SPACE_BETWEEN,
} from "./components/supplier-card-slider";

export { KanbanCard } from "./components/kanban-card";
export type {
  KanbanCardProps,
  KanbanCardStatus,
  KanbanCardAvatar,
} from "./components/kanban-card";
export {
  KANBAN_CARD_STATUSES,
  KANBAN_CARD_STATUS_ACCENTS,
} from "./components/kanban-card";
export { NineBoxCard } from "./components/nine-box-card";
export type {
  NineBoxCardAccent,
  NineBoxCardAccentTokens,
  NineBoxCardRow,
} from "./components/nine-box-card";
export {
  NINE_BOX_CARD_ACCENTS,
  NINE_BOX_CARD_ACCENT_TOKENS,
  NINE_BOX_POSITION_ACCENTS,
  NINE_BOX_POSITION_NUMBERS,
} from "./components/nine-box-card";
export { NineBoxEmptyState } from "./components/nine-box-empty-state";
export { PhaseProgress } from "./components/phase-progress";
export type {
  PhaseProgressItem,
  PhaseProgressProps,
} from "./components/phase-progress";
export {
  HorizontalBarChart,
  CustomPieChart,
  VerticalBarChart,
  ArcGauge,
  AreaChart,
  CustomChartLegend,
  StackedSegmentBar,
  PieChart,
  WaterfallChart,
  CHART_COLORS,
  formatCompactChartNumber,
} from "./components/charts";
export type {
  HorizontalBarChartProps,
  HorizontalBarClickPayload,
  HorizontalBarDataPoint,
  HorizontalBarPattern,
  HorizontalBarSeries,
  HorizontalBarStack,
  CustomPieChartProps,
  CustomPieSlice,
  VerticalBarChartProps,
  VerticalBarSeries,
  VerticalBarStack,
  ArcGaugeCenterSlotProps,
  ArcGaugeProps,
  ArcScale,
  ColorRange,
  AreaChartProps,
  AreaChartSeries,
  AreaChartSeriesType,
  ChartLegendItem,
  StackedSegmentBarItem,
  PieChartItem,
  PieChartLabelArgs,
  PieChartSliceClickPayload,
  WaterfallBarClickPayload,
  WaterfallChartProps,
  WaterfallDataPoint,
} from "./components/charts";
export { BubbleMap, COUNTRY_CENTROIDS } from "./components/bubble-map";
export type {
  BubbleMapProps,
  BubbleMapData,
  BubbleMapPoint,
  BubbleMapMetric,
  BubbleMapGroup,
  BubbleMapLocationClickedPayload,
} from "./components/bubble-map";
export { GeoChart } from "./components/geo-chart";
export type { GeoChartProps, GeoChartRow } from "./components/geo-chart";
export { LocationMap } from "./components/location-map";
export type { LocationMapProps } from "./components/location-map";
export {
  BodyText,
  DisplayText,
  TooltipButton,
  CustomButton,
  CustomBadge,
  LevelBar,
  LevelBarGroup,
  BoxBadge,
  CustomSelect,
  DropdownPanel,
  DropdownMenuItem,
  CustomDialog,
  TextInput,
  TextArea,
  CheckBox,
  RadioButton,
  ToggleSwitch,
  RangeSlider,
  TEXT_VARIANTS,
  TEXT_WEIGHTS,
  DISPLAY_VARIANTS,
  TOOLTIP_POSITIONS,
  TOOLTIP_BUTTON_FALLBACK_TEXT,
  CUSTOM_BUTTON_DEFAULT_ICON,
  CUSTOM_BUTTON_ICON_POSITIONS,
  CUSTOM_BUTTON_ICON_SIZE_PX,
  CUSTOM_BUTTON_SIZES,
  CUSTOM_BUTTON_VARIANTS,
  CUSTOM_BADGE_VARIANTS,
  CUSTOM_BADGE_SOFT_VARIANTS,
  CUSTOM_BADGE_OUTLINE_VARIANTS,
  isCustomBadgeOutlineVariant,
  LEVEL_BAR_LEVELS,
  LEVEL_BAR_FILL_RATIO,
  LEVEL_BAR_FILL_COLOR,
  LEVEL_BAR_SEGMENT_COUNT,
  clampLevelBarSegments,
  getLevelBarFilledCount,
  BOX_BADGE_VARIANTS,
  TEXT_INPUT_SIZES,
  TEXT_INPUT_FILL_MODES,
  TEXT_INPUT_ROUNDEDS,
  TEXT_AREA_SIZES,
  TEXT_AREA_FILL_MODES,
  TEXT_AREA_ROUNDEDS,
  CHECK_BOX_SIZES,
  CHECK_BOX_ROUNDEDS,
  RADIO_BUTTON_SIZES,
  TOGGLE_SWITCH_SIZES,
  TOGGLE_SWITCH_ROUNDEDS,
  RANGE_SLIDER_DEFAULT_TICK_COUNT,
  RANGE_SLIDER_DEFAULT_STEP,
  DROPDOWN_PANEL_ALIGNS,
  DROPDOWN_PANEL_PLACEMENTS,
  DROPDOWN_MENU_ITEM_STARTS,
  DROPDOWN_MENU_ITEM_TRAILINGS,
} from "./components/primitives";
export { SideBar, SideBarLink } from "./components/side-bar";
export { SideBarLogo } from "./components/side-bar/logo";
export type { SideBarItem } from "./components/side-bar/types";
export { AppFooter } from "./components/app-footer";
export type {
  TextVariant,
  TextWeight,
  DisplayVariant,
  TooltipPosition,
  CustomButtonVariant,
  CustomButtonIconPosition,
  CustomButtonSize,
  CustomBadgeVariant,
  CustomBadgeSoftVariant,
  CustomBadgeOutlineVariant,
  LevelBarLevel,
  BoxBadgeVariant,
  CustomSelectValue,
  TextInputSize,
  TextInputFillMode,
  TextInputRounded,
  TextAreaSize,
  TextAreaFillMode,
  TextAreaRounded,
  CheckBoxSize,
  CheckBoxRounded,
  RadioButtonSize,
  RadioButtonValue,
  ToggleSwitchSize,
  ToggleSwitchRounded,
  RangeSliderValue,
  RangeSliderFormatValue,
  DropdownPanelAlign,
  DropdownPanelPlacement,
  DropdownMenuItemStart,
  DropdownMenuItemTrailing,
} from "./components/primitives";
// Re-exported so apps can wrap elements carrying a native `title` attribute in Kendo's styled
// tooltip (e.g. StackedSegmentBar's per-segment titles) without declaring
// @progress/kendo-vue-tooltip as their own dependency - design-system already does.
export { Tooltip } from "@progress/kendo-vue-tooltip";
// Re-exported so apps can build their own loading skeletons out of Kendo's own placeholder shape
// without declaring @progress/kendo-vue-indicators as their own dependency - design-system already
// does (see SkeletonRectangle.vue, which uses it the same way internally).
export { Skeleton } from "@progress/kendo-vue-indicators";
export { resolveSvgAsset } from "./utils/svgAssets";
export { MAX_TERMS_DAYS_CHARTS, getBarSize, StringUtils, setConfidenceScore } from "./utils";
export { getStrategyBarColor } from "./utils/strategyBarColors";
export type { ProgramSelectedAndStatus, typeOfOpportunityVisibility } from "./types";
export { OpportunityExpectedValues } from "./components/opportunity-expected-values";
export { default as BooleanYesNoColumn } from "./components/grid/custom-columns/BooleanYesNoColumn.vue";
export { default as TextColumn } from "./components/grid/custom-columns/TextColumn.vue";
export { default as NoDecimalsColumn } from "./components/grid/custom-columns/NoDecimalsColumn.vue";
export { default as MoneyColumn } from "./components/grid/custom-columns/MoneyColumn.vue";
export { default as TooltipText } from "./components/grid/custom-columns/TooltipText.vue";
export { default as ConfidenceScoreColumn } from "./components/grid/custom-columns/ConfidenceScoreColumn.vue";
export { default as TooltipColumn } from "./components/grid/custom-columns/TooltipColumn.vue";
export { default as PercentColumn } from "./components/grid/custom-columns/PercentColumn.vue";
export { default as TotalsFooterColumn } from "./components/grid/custom-columns/TotalsFooterColumn.vue";
export { messages, defaultLocale } from "./locales";
export { Locales, LOCALES } from "./locales/keys";
