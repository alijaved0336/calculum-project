import {
  ImageType,
  SubtitleType,
  Sections,
  YourValuePropositionType  
} from "../types";

export const sectionSubtitle = (newId: string): SubtitleType => ({
  id: newId,
  type: "subtitle",
  text: "Your Section Subtitle",
  visibility: true,
});

const textDefaultText = `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.3;"><p style="text-align: justify;"><span style="font-size: medium;">Neque porro quisquam est, qui dolorem ipsum, quia dolor sit,  </span></p>
<p style="text-align: justify;"><span style="font-size: medium;">amet, consectetur, adipisci velit, sed quia non numquam eius modi  </span></p>
<p style="text-align: justify;"><span style="font-size: medium;">tempora incidunt, ut labore et dolore magnam aliquam quaerat voluptatem.  </span></p></div>`;

export const sectionText = (newId: string): SubtitleType => ({
  id: newId,
  type: "text",
  text: textDefaultText,
  visibility: true,
});

export const sectionContentImageComp = (newId: string): ImageType => ({
  id: newId,
  type: "image",
  image: "",
  visibility: true,
});

export const newSection = (newId: string): Sections => ({
  id: newId,
  tabTitle: "Your Section title",
  visibility: true,
  contents: [],
});

export const yourValueProposition = (
  newId: string,
): YourValuePropositionType => ({
  id: newId,
  type: "yourValueProposition",
  visibility: true,
  title: "Your Value Proposition",
  leftTitle: "Working Capital",
  rightTitle: "Supplier Intelligence",
  middleTitle: "Benchmark",
  leftText: "Optimize your terms and unlock working capital / discounts ",
  rightText:
    "Get data insights on all suppliers (e.g. credit rating, cost of financing, buyer leverage)",
  middleText:
    "Understand what your vendors are offering to other clients - align your payment terms to your peers",
});

