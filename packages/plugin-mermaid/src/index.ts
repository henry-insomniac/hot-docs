import type { HotDocsPlugin } from "@hot-docs/core";

type MermaidTheme = "auto" | "default" | "dark" | "forest" | "neutral" | "base";

type MermaidPluginOptions = {
  mermaidUrl?: string;
  theme?: MermaidTheme;
};

type HNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  value?: string;
  children?: HNode[];
};

const DEFAULT_MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
const STYLE_NODE_ID = "hd-mermaid-style";
const SCRIPT_NODE_ATTR = "data-hot-docs-mermaid";

export default function mermaidPlugin(options?: Partial<MermaidPluginOptions>): HotDocsPlugin {
  const mermaidUrl = normalizeMermaidUrl(options?.mermaidUrl);
  const theme = normalizeTheme(options?.theme);

  return {
    name: "@hot-docs/plugin-mermaid",
    apiVersion: 1,
    capabilities: ["markdown"],
    markdown: {
      rehypePlugins: [[rehypeMermaid, { mermaidUrl, theme }]]
    }
  };
}

function normalizeMermaidUrl(value: string | undefined): string {
  const raw = String(value ?? DEFAULT_MERMAID_URL).trim();
  return raw || DEFAULT_MERMAID_URL;
}

function normalizeTheme(value: MermaidTheme | undefined): MermaidTheme {
  if (value === "default" || value === "dark" || value === "forest" || value === "neutral" || value === "base") return value;
  return "auto";
}

function rehypeMermaid(options: { mermaidUrl: string; theme: MermaidTheme }): (tree: HNode) => void {
  return (tree: HNode) => {
    if (!tree || tree.type !== "root" || !Array.isArray(tree.children)) return;

    let converted = false;
    walk(tree, (node, parent, index) => {
      if (!parent || index < 0) return false;
      if (!isElement(node, "pre")) return false;

      const code = extractMermaidCode(node);
      if (!code) return false;

      parent.children = parent.children ?? [];
      parent.children[index] = createMermaidContainer(code);
      converted = true;
      return true;
    });

    if (!converted) return;
    ensureRuntimeAssets(tree, options);
  };
}

function walk(node: HNode, visit: (node: HNode, parent: HNode | null, index: number) => boolean, parent: HNode | null = null): void {
  const children = Array.isArray(node.children) ? node.children : [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const replaced = visit(child, node, i);
    if (replaced) continue;
    walk(child, visit, node);
  }
}

function extractMermaidCode(preNode: HNode): string | undefined {
  const children = Array.isArray(preNode.children) ? preNode.children : [];
  if (!children.length) return undefined;

  const codeNode = children.find((child) => isElement(child, "code"));
  if (!codeNode) return undefined;
  if (!isMermaidCodeNode(codeNode)) return undefined;

  const source = toText(codeNode).trim();
  return source || undefined;
}

function isMermaidCodeNode(node: HNode): boolean {
  const classList = normalizeClassList(node.properties?.className);
  if (classList.includes("language-mermaid")) return true;
  if (classList.includes("lang-mermaid")) return true;
  return false;
}

function ensureRuntimeAssets(tree: HNode, options: { mermaidUrl: string; theme: MermaidTheme }): void {
  tree.children = tree.children ?? [];

  if (!tree.children.some((child) => isElementWithId(child, "style", STYLE_NODE_ID))) {
    tree.children.push(createStyleNode());
  }

  if (!tree.children.some((child) => isElementWithAttr(child, "script", SCRIPT_NODE_ATTR))) {
    tree.children.push(createScriptNode(renderRuntimeScript(options.mermaidUrl, options.theme)));
  }
}

function createMermaidContainer(source: string): HNode {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["hd-mermaid"] },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: { className: ["mermaid"] },
        children: [{ type: "text", value: source }]
      },
      {
        type: "element",
        tagName: "pre",
        properties: { className: ["hd-mermaid-fallback"], hidden: true },
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-mermaid"] },
            children: [{ type: "text", value: source }]
          }
        ]
      }
    ]
  };
}

function createStyleNode(): HNode {
  return {
    type: "element",
    tagName: "style",
    properties: { id: STYLE_NODE_ID },
    children: [
      {
        type: "text",
        value:
          ".hd-mermaid{margin:1rem 0;overflow-x:auto;}" +
          ".hd-mermaid .mermaid{text-align:left;}" +
          ".hd-mermaid-fallback{margin-top:.75rem;white-space:pre;}" +
          ".hd-mermaid-fallback[hidden]{display:none;}"
      }
    ]
  };
}

function createScriptNode(script: string): HNode {
  return {
    type: "element",
    tagName: "script",
    properties: { type: "module", [SCRIPT_NODE_ATTR]: "1" },
    children: [{ type: "text", value: script }]
  };
}

function renderRuntimeScript(mermaidUrl: string, theme: MermaidTheme): string {
  const themeExpr = theme === "auto" ? "(prefersDark ? \"dark\" : \"default\")" : JSON.stringify(theme);
  return (
    `import mermaid from ${JSON.stringify(mermaidUrl)};\n` +
    `const blocks = Array.from(document.querySelectorAll(".hd-mermaid"));\n` +
    `if (blocks.length > 0) {\n` +
    `  const prefersDark = typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;\n` +
    `  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: ${themeExpr} });\n` +
    `  const nodes = blocks.map((block) => block.querySelector(".mermaid")).filter(Boolean);\n` +
    `  try {\n` +
    `    if (nodes.length) await mermaid.run({ nodes });\n` +
    `  } catch (error) {\n` +
    `    console.error("[hot-docs][mermaid] render failed", error);\n` +
    `    for (const block of blocks) {\n` +
    `      const fallback = block.querySelector(".hd-mermaid-fallback");\n` +
    `      if (fallback) fallback.hidden = false;\n` +
    `    }\n` +
    `  }\n` +
    `}\n`
  );
}

function isElement(node: HNode, tagName: string): boolean {
  return node?.type === "element" && node.tagName === tagName;
}

function isElementWithId(node: HNode, tagName: string, id: string): boolean {
  return isElement(node, tagName) && String(node.properties?.id ?? "") === id;
}

function isElementWithAttr(node: HNode, tagName: string, attrName: string): boolean {
  return isElement(node, tagName) && node.properties != null && Object.prototype.hasOwnProperty.call(node.properties, attrName);
}

function normalizeClassList(className: unknown): string[] {
  if (Array.isArray(className)) return className.map((item) => String(item)).filter(Boolean);
  if (typeof className === "string") return className.split(/\s+/).filter(Boolean);
  return [];
}

function toText(node: HNode): string {
  if (!node) return "";
  if (node.type === "text") return String(node.value ?? "");
  if (!Array.isArray(node.children) || node.children.length === 0) return "";
  return node.children.map(toText).join("");
}
