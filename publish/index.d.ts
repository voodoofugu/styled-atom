// STYLE_CORE ////////////////////////////////////
type StyleCoreT = {
  /**---
   * ✨ *Required: the style import function.*
   * @example
   * ```tsx
   * <StyleCore path={(name) => import(`./styles/css/${name}.css`)} />
   * ```
   * */
  path: (fileName: string) => Promise<{
    default: string;
  }>;
};

/**
 * ## *StyleCore component* ✦
 *
 * ---
 * ## PROPS:
 * - `path` *◄ REQUIRED ►*
 * ##### ! MORE DETAILS IN PROPS OR LINKS !
 *
 * ---
 * ## RETURNS:
 * null.
 *
 * ---
 * ## LINKS:
 * [StyleCore Documentation](https://github.com/voodoofugu/styled-atom?tab=readme-ov-file#-stylecore)
 */
declare const StyleCore: React.FC<StyleCoreT>;

// STYLED_ATOM ///////////////////////////////////
type StyledAtomT = {
  /**---
   * ✨ *Array of CSS file names required for the component.*
   * @example
   * ```tsx
   * <StyledAtom
   *   fileNames={["main-style", "another-style"]}
   * />
   * ```
   * */
  fileNames: string[];
  /**---
   * ✨ *Encapsulates styles with CSS file names, supports custom classes.*
   * @example
   * ```tsx
   * <StyledAtom
   *   encap
   *   // or encap="custom-class"
   *   // another props
   * />
   * ```
   * */
  encap?: boolean | string;
  /**---
   * ✨ *React node to render while styles are loading.*
   * @example
   * ```tsx
   * <StyledAtom
   *   fallback={<div>Loading...</div>}
   *   // another props
   * />
   * ```
   * */
  fallback?: React.ReactNode;
  /**---
   * ✨ *Callback triggered after styles are loaded successfully.*
   * @example
   * ```tsx
   * <StyledAtom
   *   onLoad={() => console.log("Styles loaded!")}
   *   // another props
   * />
   * ```
   * */
  onLoad?: () => void;
  /**---
   * ✨ *React node(s) to render inside the `atom-shell`.*
   * @example
   * ```tsx
   * <StyledAtom {props} >
   *   <div>Content</div>
   * </StyledAtom>
   * ```
   * */
  children?: React.ReactNode;
};

/**
 * ## *StyledAtom component* ✦
 *
 * ---
 * ## PROPS:
 * - `fileNames` *◄ REQUIRED ►*
 * - `encap`
 * - `fallback`
 * - `onLoad`
 * - `children`
 * ##### ! MORE DETAILS IN PROPS OR LINKS !
 *
 * ---
 * ## RETURNS:
 * A JSX element if `children` exist, or `null` if not provided or styles are not loaded.
 *
 * ---
 * ## LINKS:
 * [StyledAtom Documentation](https://github.com/voodoofugu/styled-atom?tab=readme-ov-file#-styledatom)
 */

declare const StyledAtom: React.FC<StyledAtomT>;

export { StyleCore, StyledAtom };
