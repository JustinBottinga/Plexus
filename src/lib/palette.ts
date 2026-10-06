export const PALETTE = [
  { key: "butter", label: "Botergeel", bg: "bg-butter", deep: "bg-butter-deep" },
  { key: "periwinkle", label: "Lavendelblauw", bg: "bg-periwinkle", deep: "bg-periwinkle-deep" },
  { key: "mint", label: "Mint", bg: "bg-mint", deep: "bg-mint-deep" },
  { key: "peach", label: "Perzik", bg: "bg-peach", deep: "bg-peach-deep" },
  { key: "sky", label: "Hemelsblauw", bg: "bg-sky", deep: "bg-sky-deep" },
  { key: "lilac", label: "Lila", bg: "bg-lilac", deep: "bg-lilac-deep" },
] as const;

export type ColorKey = (typeof PALETTE)[number]["key"];

export function colorOf(key: string | null | undefined) {
  return PALETTE.find((p) => p.key === key) ?? PALETTE[0];
}
