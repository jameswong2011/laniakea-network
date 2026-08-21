import {
  VAULT_SUB_TOPICS,
  type SubTopic,
  type VaultSubTopic,
} from "@/types";

export const VAULT_ROOT = "/Users/alexcohen/InvestmentVault";

export type VaultKind = "thesis" | "sector" | "macro";

export type VaultEntry = {
  kind: VaultKind;
  file: string;
  title: string;
  topic: SubTopic;
  ticker?: string;
};

/** Vault slices that exist because the vault does, not because GICS does. */
export const VAULT_BOOK_BLURBS: Record<VaultSubTopic, string> = {
  "AI Compute":
    "Accelerators and the CUDA / custom-XPU debate. NVDA, AMD, Cerebras, Arm, Astera.",
  "AI Infrastructure":
    "Neoclouds, GPU rental, enterprise storage, and the capex stack around the cluster.",
  "Datacenter Power":
    "800VDC, cooling, modular conversion, fuel cells. Vertiv, Vicor, Bloom.",
  "Digital Media":
    "Social, ads, streaming, gaming, edtech, commerce. The consumer internet tape.",
  "Semi Equipment":
    "WFE, test, and metrology. AMAT, Lam, KLA, BESI, Advantest, DISCO.",
  Memory: "DRAM, HBM, NAND. The cycle, not the GPU logo.",
  "Advanced Packaging":
    "ABF, CoWoS / CoPoS, CCL, glass-core, MLCCs. Ajinomoto through Taiyo Yuden.",
  Foundry: "TSMC, Intel foundry, Tower, custom silicon and OSAT.",
  Photonics: "Optical interconnect, lasers, compound semi. Lumentum through Sivers.",
};

function thesis(
  file: string,
  ticker: string,
  name: string,
  topic: SubTopic
): VaultEntry {
  return {
    kind: "thesis",
    file: `Theses/${file}`,
    title: `${ticker} — ${name}`,
    topic,
    ticker,
  };
}

export const VAULT_THESES: VaultEntry[] = [
  thesis("NVDA - Nvidia.md", "NVDA", "Nvidia", "AI Compute"),
  thesis("AMD - Advanced Micro Devices.md", "AMD", "Advanced Micro Devices", "AI Compute"),
  thesis("CBRS - Cerebras Systems.md", "CBRS", "Cerebras Systems", "AI Compute"),
  thesis("ARM - Arm Holdings.md", "ARM", "Arm Holdings", "AI Compute"),
  thesis("ALAB - Astera Labs.md", "ALAB", "Astera Labs", "AI Compute"),
  thesis("AMAT - Applied Materials.md", "AMAT", "Applied Materials", "Semi Equipment"),
  thesis("LRCX - Lam Research.md", "LRCX", "Lam Research", "Semi Equipment"),
  thesis("KLA - KLA Corporation.md", "KLA", "KLA Corporation", "Semi Equipment"),
  thesis("BESI - BE Semiconductor Industries.md", "BESI", "BE Semiconductor Industries", "Semi Equipment"),
  thesis("ASMI - ASM International.md", "ASMI", "ASM International", "Semi Equipment"),
  thesis("6146 - DISCO.md", "6146", "DISCO", "Semi Equipment"),
  thesis("TER - Teradyne.md", "TER", "Teradyne", "Semi Equipment"),
  thesis("6857 - Advantest.md", "6857", "Advantest", "Semi Equipment"),
  thesis("FORM - FormFactor.md", "FORM", "FormFactor", "Semi Equipment"),
  thesis("CAMT - Camtek.md", "CAMT", "Camtek", "Semi Equipment"),
  thesis("ONTO - Onto Innovation.md", "ONTO", "Onto Innovation", "Semi Equipment"),
  thesis("AEHR - Aehr Test Systems.md", "AEHR", "Aehr Test Systems", "Semi Equipment"),
  thesis("AIXA - Aixtron.md", "AIXA", "Aixtron", "Semi Equipment"),
  thesis("036930 - Jusung Engineering.md", "036930", "Jusung Engineering", "Semi Equipment"),
  thesis("6515 - WinWay Technology.md", "6515", "WinWay Technology", "Semi Equipment"),
  thesis("000660 - SK Hynix.md", "000660", "SK Hynix", "Memory"),
  thesis("MU - Micron Technology.md", "MU", "Micron Technology", "Memory"),
  thesis("285A - Kioxia.md", "285A", "Kioxia", "Memory"),
  thesis("SNDK - SanDisk.md", "SNDK", "SanDisk", "Memory"),
  thesis("2802 - Ajinomoto.md", "2802", "Ajinomoto", "Advanced Packaging"),
  thesis("2383 - Elite Material.md", "2383", "Elite Material", "Advanced Packaging"),
  thesis("3110 - Nitto Boseki.md", "3110", "Nitto Boseki", "Advanced Packaging"),
  thesis("LPKF - LPKF Laser & Electronics.md", "LPKF", "LPKF Laser & Electronics", "Advanced Packaging"),
  thesis("6981 - Murata Manufacturing.md", "6981", "Murata Manufacturing", "Advanced Packaging"),
  thesis("6976 - Taiyo Yuden.md", "6976", "Taiyo Yuden", "Advanced Packaging"),
  thesis("SOI - Soitec.md", "SOI", "Soitec", "Advanced Packaging"),
  thesis("TSM - Taiwan Semiconductor.md", "TSM", "Taiwan Semiconductor", "Foundry"),
  thesis("INTC - Intel.md", "INTC", "Intel", "Foundry"),
  thesis("TSEM - Tower Semiconductor.md", "TSEM", "Tower Semiconductor", "Foundry"),
  thesis("AVGO - Broadcom.md", "AVGO", "Broadcom", "Foundry"),
  thesis("MRVL - Marvell Technology.md", "MRVL", "Marvell Technology", "Foundry"),
  thesis("2454 - MediaTek.md", "2454", "MediaTek", "Foundry"),
  thesis("LITE - Lumentum.md", "LITE", "Lumentum", "Photonics"),
  thesis("COHR - Coherent.md", "COHR", "Coherent", "Photonics"),
  thesis("AAOI - Applied Optoelectronics.md", "AAOI", "Applied Optoelectronics", "Photonics"),
  thesis("IQE - IQE.md", "IQE", "IQE", "Photonics"),
  thesis("SIVE - Sivers Semiconductors.md", "SIVE", "Sivers Semiconductors", "Photonics"),
  thesis("CRWV - CoreWeave.md", "CRWV", "CoreWeave", "AI Infrastructure"),
  thesis("NBIS - Nebius Group.md", "NBIS", "Nebius Group", "AI Infrastructure"),
  thesis("IREN - IREN Limited.md", "IREN", "IREN Limited", "AI Infrastructure"),
  thesis("ORCL - Oracle Corporation.md", "ORCL", "Oracle Corporation", "AI Infrastructure"),
  thesis("PSTG - Pure Storage.md", "PSTG", "Pure Storage", "AI Infrastructure"),
  thesis("SPCX - SpaceX.md", "SPCX", "SpaceX", "AI Infrastructure"),
  thesis("VRT - Vertiv Holdings.md", "VRT", "Vertiv Holdings", "Datacenter Power"),
  thesis("VICR - Vicor Corporation.md", "VICR", "Vicor Corporation", "Datacenter Power"),
  thesis("BE - Bloom Energy.md", "BE", "Bloom Energy", "Datacenter Power"),
  thesis("NOW - ServiceNow.md", "NOW", "ServiceNow", "Software"),
  thesis("INTU - Intuit.md", "INTU", "Intuit", "Software"),
  thesis("CSU - Constellation Software.md", "CSU", "Constellation Software", "Software"),
  thesis("PCOR - Procore Technologies.md", "PCOR", "Procore Technologies", "Software"),
  thesis("WTC - WiseTech Global.md", "WTC", "WiseTech Global", "Software"),
  thesis("PLTR - Palantir.md", "PLTR", "Palantir", "Software"),
  thesis("IOT - Samsara.md", "IOT", "Samsara", "Software"),
  thesis("META - Meta.md", "META", "Meta", "Digital Media"),
  thesis("APP - AppLovin.md", "APP", "AppLovin", "Digital Media"),
  thesis("PINS - Pinterest.md", "PINS", "Pinterest", "Digital Media"),
  thesis("SE - Sea Limited.md", "SE", "Sea Limited", "Digital Media"),
  thesis("SHOP - Shopify.md", "SHOP", "Shopify", "Digital Media"),
  thesis("NFLX - Netflix.md", "NFLX", "Netflix", "Digital Media"),
  thesis("SPOT - Spotify.md", "SPOT", "Spotify", "Digital Media"),
  thesis("TTWO - Take-Two Interactive.md", "TTWO", "Take-Two Interactive", "Digital Media"),
  thesis("DUOL - Duolingo.md", "DUOL", "Duolingo", "Digital Media"),
  thesis("GRND - Grindr.md", "GRND", "Grindr", "Digital Media"),
  thesis("KAMBI - Kambi Group.md", "KAMBI", "Kambi Group", "Digital Media"),
  thesis("GAW - Games Workshop.md", "GAW", "Games Workshop", "Digital Media"),
  thesis("EINK - E Ink Holdings.md", "EINK", "E Ink Holdings", "Digital Media"),
  thesis("ISRG - Intuitive Surgical.md", "ISRG", "Intuitive Surgical", "Healthcare"),
  thesis("HIMS - Hims & Hers Health.md", "HIMS", "Hims & Hers Health", "Healthcare"),
  thesis("CRWD - CrowdStrike Holdings.md", "CRWD", "CrowdStrike Holdings", "Cybersecurity"),
  thesis("PANW - Palo Alto Networks.md", "PANW", "Palo Alto Networks", "Cybersecurity"),
  thesis("NET - Cloudflare.md", "NET", "Cloudflare", "Cybersecurity"),
  thesis("ONON - On Holding.md", "ONON", "On Holding", "Consumer"),
  thesis("MTN - Vail Resorts.md", "MTN", "Vail Resorts", "Consumer"),
  thesis("LYV - Live Nation Entertainment.md", "LYV", "Live Nation Entertainment", "Consumer"),
  thesis("5332 - TOTO Ltd.md", "5332", "TOTO Ltd", "Consumer"),
  thesis("DE - John Deere.md", "DE", "John Deere", "Industrials"),
  thesis("STNG - Scorpio Tankers.md", "STNG", "Scorpio Tankers", "Industrials"),
  thesis("UBER - Uber.md", "UBER", "Uber", "Autos"),
  thesis("LNG - Cheniere Energy.md", "LNG", "Cheniere Energy", "Energy"),
  thesis("CATL - Contemporary Amperex Technology.md", "CATL", "Contemporary Amperex Technology", "Energy"),
  thesis("CCJ - Cameco.md", "CCJ", "Cameco", "Mining"),
  thesis("GLD - SPDR Gold Shares.md", "GLD", "SPDR Gold Shares", "Commodities"),
  thesis("CSGP - CoStar Group.md", "CSGP", "CoStar Group", "Real Estate"),
  thesis("OPEN - Opendoor.md", "OPEN", "Opendoor", "Real Estate"),
  thesis("SKM - SK Telecom.md", "SKM", "SK Telecom", "Telecom"),
  thesis("BTC-CRYPTO - Bitcoin & Digital Assets.md", "BTC", "Bitcoin & Digital Assets", "Crypto"),
  thesis("CRCL - Circle Internet Group.md", "CRCL", "Circle Internet Group", "Crypto"),
  thesis("HOOD - Robinhood Markets.md", "HOOD", "Robinhood Markets", "Payments"),
  thesis("RELIANCE - Reliance Industries.md", "RELIANCE", "Reliance Industries", "Emerging Markets"),
  thesis("EDEL - Edelweiss Financial Group.md", "EDEL", "Edelweiss Financial Group", "Emerging Markets"),
];

export const VAULT_MACROS: VaultEntry[] = [
  {
    kind: "macro",
    file: "Macro & Technology/800VDC Adoption.md",
    title: "800VDC Adoption",
    topic: "Datacenter Power",
  },
  {
    kind: "macro",
    file: "Macro & Technology/AI Datacenter Financing Mechanism Design.md",
    title: "AI Datacenter Financing Mechanism Design",
    topic: "AI Infrastructure",
  },
  {
    kind: "macro",
    file: "Macro & Technology/Sustainability of AI Capex.md",
    title: "Sustainability of AI Capex",
    topic: "AI Infrastructure",
  },
  {
    kind: "macro",
    file: "Macro & Technology/Agentic Internet.md",
    title: "Agentic Internet",
    topic: "Software",
  },
  {
    kind: "macro",
    file: "Macro & Technology/CXL Memory Disaggregation Framework.md",
    title: "CXL Memory Disaggregation Framework",
    topic: "Memory",
  },
  {
    kind: "macro",
    file: "Macro & Technology/DRAM Memory Cycle - Duration, Peak Timing and Second-Order Effects.md",
    title: "DRAM Memory Cycle",
    topic: "Memory",
  },
  {
    kind: "macro",
    file: "Macro & Technology/CoWoS-to-CoPoS Panel-Level Packaging Transition.md",
    title: "CoWoS-to-CoPoS Panel-Level Packaging Transition",
    topic: "Advanced Packaging",
  },
  {
    kind: "macro",
    file: "Macro & Technology/Organic ABF to Glass-Core Substrate Transition.md",
    title: "Organic ABF to Glass-Core Substrate Transition",
    topic: "Advanced Packaging",
  },
  {
    kind: "macro",
    file: "Macro & Technology/Humanoid Robotics Supply Chain.md",
    title: "Humanoid Robotics Supply Chain",
    topic: "Industrials",
  },
  {
    kind: "macro",
    file: "Macro & Technology/Iran War Trading Playbook.md",
    title: "Iran War Trading Playbook",
    topic: "Macro",
  },
  {
    kind: "macro",
    file: "Macro & Technology/Stablecoin Regulation as Geopolitical Infrastructure.md",
    title: "Stablecoin Regulation as Geopolitical Infrastructure",
    topic: "Crypto",
  },
];

export const VAULT_SECTORS: VaultEntry[] = [
  { kind: "sector", file: "Sectors/Compute & AI Compute Accelerators.md", title: "Compute & AI Compute Accelerators", topic: "AI Compute" },
  { kind: "sector", file: "Sectors/Neoclouds & GPU-as-a-Service.md", title: "Neoclouds & GPU-as-a-Service", topic: "AI Infrastructure" },
  { kind: "sector", file: "Sectors/Enterprise Storage Infrastructure.md", title: "Enterprise Storage Infrastructure", topic: "AI Infrastructure" },
  { kind: "sector", file: "Sectors/Data Center Power & Cooling.md", title: "Data Center Power & Cooling", topic: "Datacenter Power" },
  { kind: "sector", file: "Sectors/Modular Power Conversion Components.md", title: "Modular Power Conversion Components", topic: "Datacenter Power" },
  { kind: "sector", file: "Sectors/Natural Gas Fuel Cells.md", title: "Natural Gas Fuel Cells", topic: "Datacenter Power" },
  { kind: "sector", file: "Sectors/@Vertical Market Software.md", title: "Vertical Market Software", topic: "Software" },
  { kind: "sector", file: "Sectors/Enterprise Workflow AI & Automation.md", title: "Enterprise Workflow AI & Automation", topic: "Software" },
  { kind: "sector", file: "Sectors/Accounting & ERP Software.md", title: "Accounting & ERP Software", topic: "Software" },
  { kind: "sector", file: "Sectors/Building & Construction Software.md", title: "Building & Construction Software", topic: "Software" },
  { kind: "sector", file: "Sectors/Logistics & Supply Chain Software.md", title: "Logistics & Supply Chain Software", topic: "Software" },
  { kind: "sector", file: "Sectors/Social Platforms & Digital Advertising.md", title: "Social Platforms & Digital Advertising", topic: "Digital Media" },
  { kind: "sector", file: "Sectors/Mobile Advertising Technology.md", title: "Mobile Advertising Technology", topic: "Digital Media" },
  { kind: "sector", file: "Sectors/E-commerce Infrastructure.md", title: "E-commerce Infrastructure", topic: "Digital Media" },
  { kind: "sector", file: "Sectors/Music Streaming.md", title: "Music Streaming", topic: "Digital Media" },
  { kind: "sector", file: "Sectors/Video Streaming.md", title: "Video Streaming", topic: "Digital Media" },
  { kind: "sector", file: "Sectors/Video Game Publishing.md", title: "Video Game Publishing", topic: "Digital Media" },
  { kind: "sector", file: "Sectors/Consumer Edtech.md", title: "Consumer Edtech", topic: "Digital Media" },
  { kind: "sector", file: "Sectors/Hobby & Tabletop Gaming.md", title: "Hobby & Tabletop Gaming", topic: "Digital Media" },
  { kind: "sector", file: "Sectors/@Online Gambling.md", title: "Online Gambling", topic: "Digital Media" },
  { kind: "sector", file: "Sectors/Display Technology & E-Paper.md", title: "Display Technology & E-Paper", topic: "Digital Media" },
  { kind: "sector", file: "Sectors/Semiconductor Capital Equipment.md", title: "Semiconductor Capital Equipment", topic: "Semi Equipment" },
  { kind: "sector", file: "Sectors/Semiconductor Test Equipment.md", title: "Semiconductor Test Equipment", topic: "Semi Equipment" },
  { kind: "sector", file: "Sectors/Advanced Semi Metrology.md", title: "Advanced Semi Metrology", topic: "Semi Equipment" },
  { kind: "sector", file: "Sectors/DRAM & HBM Memory.md", title: "DRAM & HBM Memory", topic: "Memory" },
  { kind: "sector", file: "Sectors/NAND Memory & Storage.md", title: "NAND Memory & Storage", topic: "Memory" },
  { kind: "sector", file: "Sectors/ABF Substrates & Advanced Packaging Supply Chain.md", title: "ABF Substrates & Advanced Packaging", topic: "Advanced Packaging" },
  { kind: "sector", file: "Sectors/Copper-Clad Laminate & PCB Materials.md", title: "Copper-Clad Laminate & PCB Materials", topic: "Advanced Packaging" },
  { kind: "sector", file: "Sectors/MLCC & Power Semiconductors.md", title: "MLCC & Power Semiconductors", topic: "Advanced Packaging" },
  { kind: "sector", file: "Sectors/Semiconductor Foundries.md", title: "Semiconductor Foundries", topic: "Foundry" },
  { kind: "sector", file: "Sectors/Custom Silicon & Networking Semiconductors.md", title: "Custom Silicon & Networking Semiconductors", topic: "Foundry" },
  { kind: "sector", file: "Sectors/OSAT - Outsourced Semiconductor Assembly & Test.md", title: "OSAT", topic: "Foundry" },
  { kind: "sector", file: "Sectors/Optical Networking & Photonics.md", title: "Optical Networking & Photonics", topic: "Photonics" },
  { kind: "sector", file: "Sectors/Photonic Metrology.md", title: "Photonic Metrology", topic: "Photonics" },
  { kind: "sector", file: "Sectors/Cybersecurity.md", title: "Cybersecurity", topic: "Cybersecurity" },
  { kind: "sector", file: "Sectors/Consumer Telehealth.md", title: "Consumer Telehealth", topic: "Healthcare" },
  { kind: "sector", file: "Sectors/Surgical Robotics.md", title: "Surgical Robotics", topic: "Healthcare" },
  { kind: "sector", file: "Sectors/Athletic Footwear & Apparel.md", title: "Athletic Footwear & Apparel", topic: "Consumer" },
  { kind: "sector", file: "Sectors/@Ski Resorts & Destination Leisure.md", title: "Ski Resorts & Destination Leisure", topic: "Consumer" },
  { kind: "sector", file: "Sectors/Agriculture & Industrial Equipment.md", title: "Agriculture & Industrial Equipment", topic: "Industrials" },
  { kind: "sector", file: "Sectors/@Industrial IoT & Connected Operations.md", title: "Industrial IoT & Connected Operations", topic: "Industrials" },
  { kind: "sector", file: "Sectors/@Product Tankers & Maritime Shipping.md", title: "Product Tankers & Maritime Shipping", topic: "Industrials" },
  { kind: "sector", file: "Sectors/Mobility & Ridesharing.md", title: "Mobility & Ridesharing", topic: "Autos" },
  { kind: "sector", file: "Sectors/@LNG & Natural Gas Infrastructure.md", title: "LNG & Natural Gas Infrastructure", topic: "Energy" },
  { kind: "sector", file: "Sectors/Batteries & Energy Storage.md", title: "Batteries & Energy Storage", topic: "Energy" },
  { kind: "sector", file: "Sectors/Uranium & Nuclear Fuel.md", title: "Uranium & Nuclear Fuel", topic: "Mining" },
  { kind: "sector", file: "Sectors/Precious Metals.md", title: "Precious Metals", topic: "Commodities" },
  { kind: "sector", file: "Sectors/Real Estate Data & SaaS.md", title: "Real Estate Data & SaaS", topic: "Real Estate" },
  { kind: "sector", file: "Sectors/@PropTech & Real Estate Marketplaces.md", title: "PropTech & Real Estate Marketplaces", topic: "Real Estate" },
  { kind: "sector", file: "Sectors/@Telecommunications Services.md", title: "Telecommunications Services", topic: "Telecom" },
  { kind: "sector", file: "Sectors/Blockchain & Stablecoins.md", title: "Blockchain & Stablecoins", topic: "Crypto" },
  { kind: "sector", file: "Sectors/@Indian Financial Services.md", title: "Indian Financial Services", topic: "Emerging Markets" },
  { kind: "sector", file: "Sectors/Indian Digital Conglomerates.md", title: "Indian Digital Conglomerates", topic: "Emerging Markets" },
];

export const VAULT_CATALOG: VaultEntry[] = [
  ...VAULT_THESES,
  ...VAULT_MACROS,
  ...VAULT_SECTORS,
];

export function vaultEntriesForTopic(topic: SubTopic) {
  return VAULT_CATALOG.filter((entry) => entry.topic === topic);
}

export function vaultTopicCounts() {
  const counts = {} as Record<SubTopic, number>;
  for (const topic of VAULT_SUB_TOPICS) {
    counts[topic] = 0;
  }
  for (const entry of VAULT_CATALOG) {
    counts[entry.topic] = (counts[entry.topic] ?? 0) + 1;
  }
  return counts;
}
