import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";
import type { Plugin } from "vite";

const VIRTUAL_ID = "virtual:styled-atom-readme";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const README_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../README.md",
);

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const siteLinks = (markdown: string) =>
  markdown
    .replace(
      /\(\.\/CHANGELOG\.md\)/g,
      "(https://github.com/voodoofugu/styled-atom/blob/main/CHANGELOG.md)",
    )
    .replace(
      /\(\.\/LICENSE\)/g,
      "(https://github.com/voodoofugu/styled-atom/blob/main/LICENSE)",
    );

const render = (markdown: string) =>
  marked.parse(siteLinks(markdown), { async: false }) as string;

const parseReadme = (source: string) => {
  const cleaned = source
    .replace(/^!\[[^\]]*\]\([^\n]+\)\s*/m, "")
    .trim();
  const headings = [...cleaned.matchAll(/^### (.+)$/gm)];
  const parsed = headings.map((heading, index) => {
    const title = heading[1].trim();
    const start = heading.index! + heading[0].length;
    const end = headings[index + 1]?.index ?? cleaned.length;
    const markdown = cleaned
      .slice(start, end)
      .replace(/(?:\s*<h2><\/h2>\s*)+$/, "")
      .trim();
    const html = render(markdown);
    return { id: slug(title), title, html, text: plain(html) };
  });
  const sections = parsed.filter((section) => section.id !== "table-of-contents");
  const about = sections.find((section) => section.id === "about");
  return { intro: about?.html ?? "", sections };
};

export default function readmePlugin(): Plugin {
  return {
    name: "styled-atom-readme",
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      return `export default ${JSON.stringify(
        parseReadme(readFileSync(README_FILE, "utf8")),
      )};`;
    },
    configureServer(server) {
      server.watcher.add(README_FILE);
      server.watcher.on("change", (file) => {
        if (file !== README_FILE) return;
        const graph = server.environments.client.moduleGraph;
        const module = graph.getModuleById(RESOLVED_ID);
        if (module) graph.invalidateModule(module);
        server.hot.send({ type: "full-reload" });
      });
    },
  };
}
