/**
 * `StyleCore` component.
 * @param path - Required: the style import function.
 * @example (fileName: string) => import(`../css/${fileName}.css`)
 * @param watch - Optional: enables watching `styled-atom` data in sessionStorage.
 * @returns null.
 * @see {@link https://www.npmjs.com/package/styled-atom#✦StyleCore Documentation}
 */

declare const StyleCore: ({
  path,
  watch,
}: {
  path: (fileName: string) => Promise<{
    default: string;
  }>;
  watch?: boolean;
}) => null;

/**
 * `StyledAtom` component.
 * @param fileNames - Required: array of style file names.
 * @param encap - Optional: encapsulates styles using CSS file names as classes, supports custom classes.
 * @param fallback - Optional: React fallback element.
 * @param onLoad - Optional: callback function.
 * @param children - Optional: React children elements.
 * @returns JSX element or null.
 * @see {@link https://www.npmjs.com/package/styled-atom#✦StyledAtom Documentation}
 */

declare const StyledAtom: ({
  fileNames,
  encap,
  fallback,
  onLoad,
  children,
}: {
  fileNames: string[];
  encap?: boolean | string;
  fallback?: React.ReactNode;
  onLoad?: (loaded: boolean) => void;
  children?: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element | null;

export { StyleCore, StyledAtom };
