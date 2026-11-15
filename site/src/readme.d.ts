declare module "virtual:styled-atom-readme" {
  export type ReadmeSection = {
    id: string;
    title: string;
    html: string;
    text: string;
  };

  const readme: {
    intro: string;
    sections: ReadmeSection[];
  };

  export default readme;
}
