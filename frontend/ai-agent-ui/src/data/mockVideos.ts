import type { Cue } from "@/utils/transcript";

export type VideoStatus = "indexed" | "processing" | "failed";

export interface SupportVideo {
  id: number;
  title: string;
  file: string;
  duration: string;
  durationSec?: number;
  chunks: number;
  author: string;
  date: string;
  status: VideoStatus;
  /** Object URL / remote URL. When present the player streams the real file. */
  url?: string;
  /** Parsed transcript cues. When absent the demo transcript is used. */
  cues?: Cue[];
  /** Backend UUID (from POST /videos). Present for real uploads. */
  videoId?: string;
  /** Live sub-stage label while processing (SSE-driven): "Uploading" | "Compressing" | "Indexing". */
  stage?: string;
  /** Why processing failed — shown on a Failed row so the reason isn't a mystery. */
  error?: string | null;
}

/** Demo transcript used by seeded rows that have no real cues. */
export const DEMO_TRANSCRIPT: Cue[] = [
  { t: 0, text: "Welcome — in this video we'll set up billing for your workspace from start to finish." },
  { t: 14, text: "First, open the main menu and choose Settings." },
  { t: 26, text: "Inside Settings, select the Billing tab on the left." },
  { t: 40, text: "You'll see your current plan listed at the top of the page." },
  { t: 53, text: "Click Add payment method to get started." },
  { t: 66, text: "Enter your card number, expiry date, and security code." },
  { t: 82, text: "You can also pay by bank transfer — we'll cover that later." },
  { t: 96, text: "Add a billing email so invoices go to the right person." },
  { t: 112, text: "Choose your billing cycle: monthly or annual." },
  { t: 128, text: "Annual billing gives you two months free." },
  { t: 141, text: "Review the plan summary on the right before you continue." },
  { t: 158, text: "Apply a promo code here if you have one." },
  { t: 172, text: "Click Confirm to save your billing details." },
  { t: 188, text: "A confirmation email is sent to your billing address." },
  { t: 203, text: "Next, let's set up your tax information." },
  { t: 218, text: "Add your VAT or tax ID so invoices stay compliant." },
  { t: 234, text: "You can add multiple payment methods and set a default." },
  { t: 250, text: "To change your plan, use the Upgrade button at any time." },
  { t: 268, text: "Downgrades take effect at the end of the current cycle." },
  { t: 285, text: "You can download past invoices from the Invoices section." },
  { t: 303, text: "Set up billing alerts to avoid any surprise charges." },
  { t: 322, text: "That's it — your billing is now fully configured." },
  { t: 344, text: "Thanks for watching. Check the description for related guides." },
];

// NOTE: the placeholder MOCK_VIDEOS list was removed — the library now shows real
// data from the backend (see api/videos.list.ts). DEMO_TRANSCRIPT above remains a
// fallback for the in-session player only (backend has no transcript-cues endpoint yet).
