import {
  AnalyzedSupplierType,
  CatalogType,
  ContentTypes,
  ImageType,
  IndustryType,
  IntroductionType,
  LowHangingFruitsType,
  MatchType,
  SpendVolumeDistributedType,
  SpendVolumeType,
  SubtitleType,
  SustancialAmountType,
  YourValuePropositionType,
} from "../types/index";
import {
  sectionContentImageComp,
  yourValueProposition,
  sectionSubtitle,
  sectionText,
} from "../views/mockupValues";
export const catalog: CatalogType[] = [
  {
    id: "general",
    label: "Generic Content",
    children: [
      { type: "image", title: "Image", icon: "fa-image" },
      { type: "subtitle", title: "Subtitle", icon: "fa-edit" },
      { type: "text", title: "Text", icon: "fa-edit" },
    ],
  },
  {
    id: "predisign",
    label: "Pre-design Content",
    children: [
      { type: "introduction", title: "Introduction", icon: "fa-file-alt" },
      {
        type: "spendVolume",
        title: "Executive Summary",
        icon: "fa-chart-line",
      },
      { type: "industry", title: "Industry Summary", icon: "fa-edit" },
      { type: "match", title: "Identify and Match Suppliers", icon: "fa-edit" },
      {
        type: "spendVolumeDistributed",
        title: "Spend Distribution",
        icon: "fa-edit",
      },
      {
        type: "sustancialAmount",
        title: "Calculating your Opportunity",
        icon: "fa-edit",
      },
      { type: "lowHangingFruits", title: "9 Box Analysis", icon: "fa-edit" },
      {
        type: "yourValueProposition",
        title: "Experience in your Industry",
        icon: "fa-chart-line",
      },
      {
        type: "analyzedSupplier",
        title: "Analyzed Supplier",
        icon: "fa-chart-line",
      },
    ],
  },
];


export const validContentTypes: ContentTypes["type"][] = [
  "image",
  "introduction",
  "spendVolume",
  "yourValueProposition",
  "subtitle",
  "industry",
  "match",
  "spendVolumeDistributed",
  "sustancialAmount",
  "lowHangingFruits",
  "text",
  "analyzedSupplierName",
  "analyzedSupplier",
];


export const contentTypeSource: Record<ContentTypes["type"], "local" | "api"> =
  {
    image: "local",
    yourValueProposition: "local",
    subtitle: "local",
    text: "local",
    introduction: "api",
    spendVolume: "api",
    industry: "api",
    match: "api",
    spendVolumeDistributed: "api",
    sustancialAmount: "api",
    lowHangingFruits: "api",
    analyzedSupplierName: "api",
    analyzedSupplier: "api",
  };

// Content types that can be created locally
export const localContentTypes = (
  newId: string,
  type: ContentTypes["type"],
) => {
  const localContent = {
    image: () => sectionContentImageComp(newId),
    yourValueProposition: () => yourValueProposition(newId),
    subtitle: () => sectionSubtitle(newId),
    text: () => sectionText(newId),
  };
  return localContent[type as keyof typeof localContent];
};

// Mapeo para castear contenido recibido
export const contentTypeCastMap = {
  analyzedSupplierName: (content: any) => content as AnalyzedSupplierType,
  analyzedSupplier: (content: any) => content as AnalyzedSupplierType,
  spendVolume: (content: any) => content as SpendVolumeType,
  text: (content: any) => content as SubtitleType,
  subtitle: (content: any) => content as SubtitleType,
  image: (content: any) => content as ImageType,
  yourValueProposition: (content: any) => content as YourValuePropositionType,  
  introduction: (content: any) => content as IntroductionType,
  industry: (content: any) => content as IndustryType,
  match: (content: any) => content as MatchType,
  spendVolumeDistributed: (content: any) => content as SpendVolumeDistributedType,
  sustancialAmount: (content: any) => content as SustancialAmountType,
  lowHangingFruits: (content: any) => content as LowHangingFruitsType,
};

export const isContentTypesType=(item:any)=>validContentTypes.includes(item as ContentTypes["type"])
