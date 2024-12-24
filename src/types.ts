export type StyleCoreT = {
  path: ImportStyleT;
  watch?: boolean;
};

export type StyleTagT = {
  fileNames: string[];
  children?: React.ReactNode;
};

export type StyleDataT = Record<
  string,
  {
    fileNames?: string[];
    stylesLoaded?: boolean;
  }
> | null;

export type MainDataT = {
  styleData: StyleDataT;
};

export type ImportStyleT = (fileName: string) => Promise<{ default: string }>;
