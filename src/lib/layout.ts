export const LAYOUT = {
  /** Standard page content — generous width, no cramped centering */
  page: "mx-auto w-full max-w-[1200px] px-10 py-10",
  /** Full-width content (checklist, tables) — uses all available space */
  pageWide: "w-full px-10 py-8",
  /** Narrower content for focused forms (Step 1 merchant info) */
  pageNarrow: "mx-auto w-full max-w-4xl px-10 py-10",
  /** Bottom action bar — matches page width */
  bottomBar: "mx-auto w-full max-w-[1200px] px-10 py-4",
  /** Bottom bar for wide pages */
  bottomBarWide: "w-full px-10 py-4",
} as const;
