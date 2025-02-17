export type ImportStyleT = (fileName: string) => Promise<{ default: string }>;

export type StyleCoreT = {
  path: ImportStyleT;
};

export type StyledAtomT = {
  fileNames: string[];
  encap?: boolean | string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
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
