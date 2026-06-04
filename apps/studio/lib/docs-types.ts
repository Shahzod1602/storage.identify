export interface DocExample {
  title?: string;
  lang: string; // bash | ts | sql | json
  code: string;
}
export interface DocSection {
  heading: string;
  body: string[]; // paragraphlar; `inline code` qo'llab-quvvatlanadi
  examples?: DocExample[];
}
export interface DocPage {
  slug: string;
  title: string;
  description: string;
  sections: DocSection[];
}
