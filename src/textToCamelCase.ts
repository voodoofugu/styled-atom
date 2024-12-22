export default function textToCamelCase(text: string): string {
  let transformed = text.replace(/^\d+/, "");

  transformed = transformed.replace(/[-_]\w/g, (match) =>
    match.charAt(1).toUpperCase()
  );

  transformed = transformed.charAt(0).toLowerCase() + transformed.slice(1);

  return transformed;
}
