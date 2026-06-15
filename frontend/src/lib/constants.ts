// constants.ts — shared app-wide constants.

// The five highlight colors available for list cards. Defined once here so
// the list-creation color-cycling and the edit-sheet color picker stay in sync.
// Values are CSS hex strings that map to the design token palette:
//   Fuchsia = --fuchsia-500 (primary accent)
//   Emerald = --emerald-500 (secondary accent)
//   Amber, Sky, Rose from the category palette.
export const LIST_COLORS = [
  '#d946ef', // fuchsia-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#0ea5e9', // sky-500
  '#f43f5e', // rose-500
] as const;

export type ListColor = (typeof LIST_COLORS)[number];
