export const PALETTE = [
  { key: "butter", label: "Butter", bg: "bg-butter", deep: "bg-butter-deep" },
  { key: "periwinkle", label: "Periwinkle", bg: "bg-periwinkle", deep: "bg-periwinkle-deep" },
  { key: "mint", label: "Mint", bg: "bg-mint", deep: "bg-mint-deep" },
  { key: "peach", label: "Peach", bg: "bg-peach", deep: "bg-peach-deep" },
  { key: "sky", label: "Sky", bg: "bg-sky", deep: "bg-sky-deep" },
  { key: "lilac", label: "Lilac", bg: "bg-lilac", deep: "bg-lilac-deep" },
] as const;

export type ColorKey = (typeof PALETTE)[number]["key"];

export function colorOf(key: string | null | undefined) {
  return PALETTE.find((p) => p.key === key) ?? PALETTE[0];
}
