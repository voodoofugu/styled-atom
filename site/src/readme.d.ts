declare module "virtual:styled-atom-readme" {
  export type ReadmeSection = {
    id: string;
    title: string;
    lead: string;
    html: string;
    text: string;
    children: ReadmeSection[];
  };

  const readme: {
    intro: string;
    sections: ReadmeSection[];
  };

  export default readme;
}
