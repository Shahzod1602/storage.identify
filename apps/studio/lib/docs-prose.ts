// Docs maqolalari MATNI (prose) tarjimasi — en/ru. Kod misollari bu yerda yo'q
// (ular o'zbekcha manbadan olinadi). Section'lar o'zbekcha tartibda (index bo'yicha).
import { EN as EN1, RU as RU1 } from "./docs/prose-1";
import { EN as EN2, RU as RU2 } from "./docs/prose-2";
import { EN as EN3, RU as RU3 } from "./docs/prose-3";
import { EN as EN4, RU as RU4 } from "./docs/prose-4";

export interface DocProse {
  title: string;
  description: string;
  sections: { heading: string; body: string[] }[];
}
export type ProseMap = Record<string, DocProse>;

export const PROSE_EN: ProseMap = { ...EN1, ...EN2, ...EN3, ...EN4 };
export const PROSE_RU: ProseMap = { ...RU1, ...RU2, ...RU3, ...RU4 };
