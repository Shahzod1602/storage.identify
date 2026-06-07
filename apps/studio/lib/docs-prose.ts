// Docs maqolalari MATNI (prose) tarjimasi — en/ru. Kod misollari bu yerda yo'q
// (ular o'zbekcha manbadan olinadi). Bo'sh bo'lsa o'zbekchaga qaytadi.
// section'lar o'zbekcha tartibda (index bo'yicha mos keladi).

export interface DocProse {
  title: string;
  description: string;
  sections: { heading: string; body: string[] }[];
}
export type ProseMap = Record<string, DocProse>;

// Agentlar tomonidan to'ldiriladi:
export const PROSE_EN: ProseMap = {};
export const PROSE_RU: ProseMap = {};
