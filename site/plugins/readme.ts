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

type ParsedSection = {
  id: string;
  title: string;
  lead: string;
  html: string;
  text: string;
  children: ParsedSection[];
};

type DetailBlock = {
  start: number;
  end: number;
  source: string;
};

const topLevelDetails = (markdown: string) => {
  const blocks: DetailBlock[] = [];
  const tags = markdown.matchAll(/<\/?details\b[^>]*>/gi);
  let depth = 0;
  let start = -1;

  for (const tag of tags) {
    const closing = tag[0].startsWith("</");
    if (!closing) {
      if (depth === 0) start = tag.index!;
      depth += 1;
      continue;
    }

    depth -= 1;
    if (depth === 0 && start >= 0) {
      const end = tag.index! + tag[0].length;
      blocks.push({ start, end, source: markdown.slice(start, end) });
      start = -1;
    }
  }

  return blocks;
};

const withoutBlocks = (markdown: string, blocks: DetailBlock[]) => {
  let result = markdown;
  [...blocks].reverse().forEach(({ start, end }) => {
    result = `${result.slice(0, start)}${result.slice(end)}`;
  });
  return result;
};

const cleanDetailBody = (markdown: string) =>
  markdown
    .replace(/(?:\s*<h2><\/h2>\s*)+/g, "\n")
    .replace(/^\s*<br\s*\/?>(?:\s*<ul><div>)?\s*/i, "")
    .replace(/\s*<\/div><\/ul>\s*$/i, "")
    .trim();

const parseDetails = (markdown: string, parentId: string): ParsedSection[] =>
  topLevelDetails(markdown).map((block) => {
    const inner = block.source
      .replace(/^<details\b[^>]*>/i, "")
      .replace(/<\/details>\s*$/i, "")
      .trim();
    const summaryMatch = inner.match(/^\s*<summary>([\s\S]*?)<\/summary>/i);
    const summaryHtml = summaryMatch?.[1] ?? "Untitled";
    const summaryText = plain(summaryHtml);
    const separator = summaryText.indexOf(":");
    const title = (separator === -1 ? summaryText : summaryText.slice(0, separator)).trim();
    const lead = separator === -1 ? "" : summaryText.slice(separator + 1).trim();
    const id = `${parentId}/${slug(title)}`;
    const content = inner.slice(summaryMatch?.[0].length ?? 0).trim();
    const childBlocks = topLevelDetails(content);
    const body = cleanDetailBody(withoutBlocks(content, childBlocks));
    const html = body ? render(body) : "";
    const children = parseDetails(content, id);

    return {
      id,
      title,
      lead,
      html,
      text: plain(`${lead} ${html} ${children.map((child) => child.text).join(" ")}`),
      children,
    };
  });

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
    const id = slug(title);
    const detailBlocks = topLevelDetails(markdown);
    const body = cleanDetailBody(withoutBlocks(markdown, detailBlocks));
    const html = body ? render(body) : "";
    const children = parseDetails(markdown, id);
    return {
      id,
      title,
      lead: "",
      html,
      text: plain(`${html} ${children.map((child) => child.text).join(" ")}`),
      children,
    };
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
