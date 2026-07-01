import type { StyleAtomStyles } from "./types";

const unitlessCssProperties = new Set([
  "animation-iteration-count",
  "aspect-ratio",
  "border-image-outset",
  "border-image-slice",
  "border-image-width",
  "box-flex",
  "box-flex-group",
  "box-ordinal-group",
  "column-count",
  "columns",
  "flex",
  "flex-grow",
  "flex-positive",
  "flex-shrink",
  "flex-negative",
  "flex-order",
  "grid-area",
  "grid-row",
  "grid-row-end",
  "grid-row-span",
  "grid-row-start",
  "grid-column",
  "grid-column-end",
  "grid-column-span",
  "grid-column-start",
  "font-weight",
  "line-clamp",
  "line-height",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tab-size",
  "widows",
  "z-index",
  "zoom",
]);

const contentKeywords = new Set([
  "normal",
  "none",
  "open-quote",
  "close-quote",
  "no-open-quote",
  "no-close-quote",
  "inherit",
  "initial",
  "revert",
  "revert-layer",
  "unset",
]);

const isStyleObject = (value: unknown): value is StyleAtomStyles =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cssEscape = (value: string) => {
  const cssApi = globalThis.CSS as
    | { escape?: (input: string) => string }
    | undefined;

  if (cssApi?.escape) {
    return cssApi.escape(value);
  }

  return value.replace(/(^-?\d|[^a-zA-Z0-9_-])/g, (part) => {
    const codePoint = part.codePointAt(0)?.toString(16) ?? "";
    return `\\${codePoint} `;
  });
};

const indent = (value: string) =>
  value
    .split("\n")
    .map((line) => (line.length > 0 ? `  ${line}` : line))
    .join("\n");

const toKebabCase = (property: string) => {
  if (property.startsWith("--")) return property;

  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
};

const isQuotedCssString = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;

  const quote = trimmed[0];
  return (
    (quote === '"' || quote === "'") && trimmed[trimmed.length - 1] === quote
  );
};

const isCssFunction = (value: string) => /^[a-z-]+\(/i.test(value.trim());

const formatContentValue = (value: string | number) => {
  if (typeof value !== "string") return String(value);

  const trimmed = value.trim();
  if (
    isQuotedCssString(trimmed) ||
    isCssFunction(trimmed) ||
    contentKeywords.has(trimmed.toLowerCase())
  ) {
    return trimmed;
  }

  return JSON.stringify(trimmed);
};

// проверка на то является ли свойство подходящим для форматирования
const specialPropertyFormatters: Record<
  string,
  (value: string | number) => string
> = {
  // пока только content что бы избежать '""'
  content: formatContentValue,
};

const formatStyleValue = (property: string, value: string | number) => {
  const formatter = specialPropertyFormatters[property];

  if (formatter) return formatter(value);

  if (
    typeof value === "number" &&
    value !== 0 &&
    !property.startsWith("--") &&
    !unitlessCssProperties.has(property)
  ) {
    return `${value}px`;
  }

  return String(value);
};

const resolveSelector = (parentSelector: string, selector: string) => {
  const trimmedSelector = selector.trim();

  if (!trimmedSelector) return parentSelector;
  if (trimmedSelector.includes("&")) {
    return trimmedSelector.replace(/&/g, parentSelector);
  }

  if (!parentSelector) return trimmedSelector;
  if (/^[:[]/.test(trimmedSelector))
    return `${parentSelector}${trimmedSelector}`;
  if (/^[>+~]/.test(trimmedSelector))
    return `${parentSelector} ${trimmedSelector}`;

  return `${parentSelector} ${trimmedSelector}`;
};

const wrapAtRules = (css: string, atRules: readonly string[]) =>
  atRules.reduceRight(
    (result, atRule) => `${atRule} {\n${indent(result)}\n}`,
    css,
  );

const compileDeclarations = (
  selector: string,
  declarations: readonly [string, string | number][],
  atRules: readonly string[],
) => {
  if (!selector || declarations.length === 0) return [];

  const body = declarations
    .map(([property, value]) => {
      const cssProperty = toKebabCase(property);

      return `  ${cssProperty}: ${formatStyleValue(cssProperty, value)};`;
    })
    .join("\n");

  return [wrapAtRules(`${selector} {\n${body}\n}`, atRules)];
};

const compileDescriptorAtRule = (
  atRule: string,
  styles: StyleAtomStyles,
  atRules: readonly string[],
) => {
  const declarations = Object.entries(styles).filter(
    (entry): entry is [string, string | number] =>
      !isStyleObject(entry[1]) && entry[1] !== null && entry[1] !== undefined,
  );

  if (declarations.length === 0) return [];

  const body = declarations
    .map(([property, value]) => {
      const cssProperty = toKebabCase(property);

      return `  ${cssProperty}: ${formatStyleValue(cssProperty, value)};`;
    })
    .join("\n");

  return [wrapAtRules(`${atRule} {\n${body}\n}`, atRules)];
};

const compileKeyframes = (
  atRule: string,
  styles: StyleAtomStyles,
  atRules: readonly string[],
) => {
  const frames = Object.entries(styles).flatMap(([frame, value]) => {
    if (!isStyleObject(value)) return [];

    return compileDeclarations(
      frame,
      Object.entries(value).filter(
        (entry): entry is [string, string | number] =>
          !isStyleObject(entry[1]) &&
          entry[1] !== null &&
          entry[1] !== undefined,
      ),
      [],
    );
  });

  if (frames.length === 0) return [];

  return [
    wrapAtRules(`${atRule} {\n${indent(frames.join("\n\n"))}\n}`, atRules),
  ];
};

const compileRule = (
  styles: StyleAtomStyles,
  selector: string,
  atRules: readonly string[],
): string[] => {
  const declarations: [string, string | number][] = [];
  const nestedRules: [string, StyleAtomStyles][] = [];

  Object.entries(styles).forEach(([propertyOrSelector, value]) => {
    if (isStyleObject(value)) {
      nestedRules.push([propertyOrSelector, value]);
      return;
    }

    if (value !== null && value !== undefined) {
      declarations.push([propertyOrSelector, value]);
    }
  });

  return [
    ...compileDeclarations(selector, declarations, atRules),
    ...nestedRules.flatMap(([nestedSelector, nestedStyles]) => {
      if (nestedSelector.startsWith("@")) {
        if (/^@(?:-[a-z]+-)?keyframes\b/.test(nestedSelector)) {
          return compileKeyframes(nestedSelector, nestedStyles, atRules);
        }

        if (/^@(font-face|page)\b/.test(nestedSelector)) {
          return compileDescriptorAtRule(nestedSelector, nestedStyles, atRules);
        }

        return compileRule(nestedStyles, selector, [
          ...atRules,
          nestedSelector,
        ]);
      }

      return compileRule(
        nestedStyles,
        resolveSelector(selector, nestedSelector),
        atRules,
      );
    }),
  ];
};

export const compileStyleAtomStyles = (
  name: string,
  styles: StyleAtomStyles,
  scopeSelector?: string | null,
) => {
  const baseSelector = scopeSelector ?? `.${cssEscape(name)}`;

  return compileRule(styles, baseSelector, []).join("\n\n");
};
