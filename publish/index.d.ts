/**
 * `StyleCore` component.
 * @param path - The style import function.
 * @example (fileName: string) => import(`../cssFolder/${fileName}.css`)
 * @param watch - Optional boolean value, allows watching for `styled-atom` data in sessionStorage.
 * @returns null or undefined.
 * @see {@link https://www.npmjs.com/package/styled-atom#StyleCore Documentation}
 */
declare const StyleCore: ({
  path,
  watch,
}: {
  path: (fileName: string) => Promise<{
    default: string;
  }>;
  watch?: boolean;
}) => null | undefined;

/**
 * `StyledAtom` component.
 * @param fileNames - Array of style file names.
 * @param fallback - Optional React fallback element.
 * @param onLoad - Optional callback function.
 * @param children - Optional React children elements.
 * @returns JSX element or null.
 * @see {@link https://www.npmjs.com/package/styled-atom#StyledAtom Documentation}
 */
declare const StyledAtom: ({
  fileNames,
  fallback,
  onLoad,
  children,
}: {
  fileNames: string[];
  fallback?: React.ReactNode;
  onLoad?: (loaded: boolean) => void;
  children?: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element | null;

export { StyleCore, StyledAtom };
