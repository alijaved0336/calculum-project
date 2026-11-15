export interface HardcodedSupplier {
  supplierId: string;
  userId: string;
  tenantId: string;
  sfvUuid: string;
  name: string;
  receivedName: string;
  country: string;
  parent: string;
  buyingEntities: string[];
  spendVolume: number;
  spendLines: number;
  isSme: boolean;
}

export const SUPPLIERS: HardcodedSupplier[] = [
  {
    supplierId: "0254fef3-b6df-4bae-9a1c-9f7d616d3e99",
    userId: "c05f8156-b61c-50ac-a6ff-bbebba2ce67f",
    tenantId: "ai-bot-2-1um3y",
    sfvUuid: "e19e2a4c-5fc8-4c4c-9bb6-75a6ff8159e4",
    name: "CHANEL LIMITED",
    receivedName: "Chanel LTD",
    country: "United Kingdom",
    parent: "Chanel Limited",
    buyingEntities: [],
    spendVolume: 26_742_229.39,
    spendLines: 1,
    isSme: false,
  },
  {
    supplierId: "06e0792f-f472-4b8f-b973-13b483646fd2",
    userId: "c05f8156-b61c-50ac-a6ff-bbebba2ce67f",
    tenantId: "ai-bot-2-1um3y",
    sfvUuid: "e19e2a4c-5fc8-4c4c-9bb6-75a6ff8159e4",
    name: "Chocoladefabriken Lindt & Sprüngli AG",
    receivedName: "LINDT & SPRUNGLI",
    country: "Switzerland",
    parent: "N/A",
    buyingEntities: [],
    spendVolume: 20_920_191.295,
    spendLines: 1,
    isSme: false,
  },
  {
    supplierId: "01a07f52-c18e-4b07-85c6-14f67e3811c9",
    userId: "c05f8156-b61c-50ac-a6ff-bbebba2ce67f",
    tenantId: "ai-bot-2-1um3y",
    sfvUuid: "e19e2a4c-5fc8-4c4c-9bb6-75a6ff8159e4",
    name: "Salt Lake City Department of Airport",
    receivedName: "SALT LAKE AIRPORT AUTHORITY",
    country: "United States",
    parent: "N/A",
    buyingEntities: ["Whole Foods Market - United States"],
    spendVolume: 10_823_986.615,
    spendLines: 1,
    isSme: false,
  },
  {
    supplierId: "04439d6b-a944-4996-8b33-72c2b3fe5b86",
    userId: "c05f8156-b61c-50ac-a6ff-bbebba2ce67f",
    tenantId: "ai-bot-2-1um3y",
    sfvUuid: "e19e2a4c-5fc8-4c4c-9bb6-75a6ff8159e4",
    name: "ORACLE AMERICA, INC.",
    receivedName: "Oracle America Inc.",
    country: "United States",
    parent: "Oracle Corporation",
    buyingEntities: [],
    spendVolume: 7_344_372.155,
    spendLines: 1,
    isSme: false,
  },
  {
    supplierId: "01dc00bd-f00c-417c-b04b-83383578b282",
    userId: "c05f8156-b61c-50ac-a6ff-bbebba2ce67f",
    tenantId: "ai-bot-2-1um3y",
    sfvUuid: "e19e2a4c-5fc8-4c4c-9bb6-75a6ff8159e4",
    name: "FRESH & READY FOODS LLC",
    receivedName: "FRESH & READY FOODS LLC",
    country: "United States",
    parent: "COMPASS GROUP PLC",
    buyingEntities: [],
    spendVolume: 4_227_547.335,
    spendLines: 1,
    isSme: false,
  },
];

export function findSupplier(
  supplierId: string,
): HardcodedSupplier | undefined {
  return SUPPLIERS.find((s) => s.supplierId === supplierId);
}

export function formatSpendVolume(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(2);
}

export function supplierInitials(name: string): string {
  return name
    .split(/[\s,&+]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
