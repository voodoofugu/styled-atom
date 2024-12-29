export type ImportStyleT = (fileName: string) => Promise<{ default: string }>;

export type StyleCoreT = {
  path: ImportStyleT;
  watch?: boolean;
};

export type StyledAtomT = {
  fileNames: string[];
  encap?: boolean;
  fallback?: React.ReactNode;
  onLoad?: (loaded: boolean) => void;
  children?: React.ReactNode;
};

export type StyleDataT = Record<
  string,
  {
    fileNames?: string[];
    loaded?: boolean;
  }
> | null;

export type MainDataT = {
  styleData: StyleDataT;
};
