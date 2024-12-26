export type ImportStyleT = (fileName: string) => Promise<{ default: string }>;

export type StyleCoreT = {
  path: ImportStyleT;
  watch?: boolean;
};

export type StyledAtomT = {
  fileNames: string[];
  children?: React.ReactNode;
  onLoad?: (loaded: boolean) => void;
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
