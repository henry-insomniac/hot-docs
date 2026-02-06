import type { HotDocsPlugin } from "@hot-docs/core";

type AiUiPluginOptions = {
  endpointBase?: string;
  includeCollections?: string[];
  enableDocQa?: boolean;
  enableTranslate?: boolean;
};

export default function aiUiPlugin(options?: Partial<AiUiPluginOptions>): HotDocsPlugin {
  const endpointBase = normalizeEndpointBase(options?.endpointBase);
  const includeCollections = normalizeIncludeCollections(options?.includeCollections);
  const enableDocQa = options?.enableDocQa ?? true;
  const enableTranslate = options?.enableTranslate ?? true;

  return {
    name: "@hot-docs/plugin-ai-ui",
    apiVersion: 1,
    capabilities: ["markdown"],
    markdown: {
      rehypePlugins: [
        [
          rehypeInsertAiPanel,
          {
            endpointBase,
            includeCollections,
            enableDocQa,
            enableTranslate
          }
        ]
      ]
    }
  };
}

function normalizeEndpointBase(value: string | undefined): string {
  const raw = String(value ?? "/seed").trim();
  const v = raw.replace(/\/+$/, "") || "/";
  return v.startsWith("/") ? v : `/${v}`;
}

function normalizeIncludeCollections(value: string[] | undefined): Set<string> | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map((v) => String(v).trim()).filter(Boolean);
  return items.length ? new Set(items) : undefined;
}

function rehypeInsertAiPanel(opts: {
  endpointBase: string;
  includeCollections?: Set<string>;
  enableDocQa: boolean;
  enableTranslate: boolean;
}): any {
  const endpointBase = normalizeEndpointBase(opts?.endpointBase);
  const includeCollections = opts?.includeCollections;
  const enableDocQa = !!opts?.enableDocQa;
  const enableTranslate = !!opts?.enableTranslate;

  return (tree: any, file: any) => {
    const hotDocs = file?.data?.hotDocs;
    const config = hotDocs?.config;
    const entry = hotDocs?.entry;
    if (!config || !entry) return;
    if (includeCollections && !includeCollections.has(entry.collection)) return;

    if (!tree || tree.type !== "root" || !Array.isArray(tree.children)) return;
    if (
      tree.children.some(
        (n: any) =>
          n &&
          n.type === "element" &&
          (n.tagName === "section" || n.tagName === "div") &&
          Array.isArray(n.properties?.className) &&
          n.properties.className.includes("hd-ai")
      )
    ) {
      return;
    }

    const panelId = `hd-ai-${String(entry.id || entry.routePath || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 24) || "panel"}`;
    const routePath = String(entry.routePath || "/");
    const siteBase = String(config.site?.base || "/");

    const buttons: any[] = [];
    if (enableDocQa) {
      buttons.push(buttonNode("问本文档", "ask"));
      buttons.push(buttonNode("总结", "summary"));
      buttons.push(buttonNode("生成步骤", "steps"));
    }
    if (enableTranslate) {
      buttons.push(buttonNode("翻译选中", "translate"));
    }

    const style = `
.hd-ai{border:1px solid var(--hd-border,#2b2b2b);background:color-mix(in srgb,var(--hd-bg,#0b0b0b),#fff 3%);padding:12px 12px 10px;border-radius:12px;margin:0 0 14px}
.hd-ai .hd-ai-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.hd-ai button{appearance:none;border:1px solid var(--hd-border,#2b2b2b);background:transparent;color:inherit;padding:6px 10px;border-radius:10px;cursor:pointer;font:inherit}
.hd-ai button:hover{border-color:color-mix(in srgb,var(--hd-border,#2b2b2b),#fff 18%)}
.hd-ai button:disabled{opacity:.5;cursor:not-allowed}
.hd-ai .hd-ai-note{margin:8px 0 0;opacity:.75;font-size:12px}
.hd-ai .hd-ai-output{margin:10px 0 0;display:none}
.hd-ai .hd-ai-output.is-open{display:block}
.hd-ai .hd-ai-answer{white-space:pre-wrap;line-height:1.6}
.hd-ai .hd-ai-cites{margin:10px 0 0;padding-left:18px}
.hd-ai .hd-ai-cites li{margin:4px 0}
.hd-ai .hd-ai-cite-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.hd-ai .hd-ai-copy{padding:4px 8px;border-radius:10px;font-size:12px;opacity:.9}
.hd-ai details{margin:6px 0 0}
.hd-ai summary{cursor:pointer;opacity:.85;font-size:12px}
.hd-ai .hd-ai-quote{margin:6px 0 0;padding:8px 10px;border-left:3px solid var(--hd-accent,#7c3aed);background:color-mix(in srgb,var(--hd-bg,#0b0b0b),#fff 4%);border-radius:8px;opacity:.95;white-space:pre-wrap}
`.trim();

    const script = buildClientScript({ panelId, endpointBase, siteBase, routePath, enableDocQa, enableTranslate });

    tree.children.unshift({
      type: "element",
      tagName: "section",
      properties: {
        id: panelId,
        className: ["hd-ai"],
        "data-endpoint-base": endpointBase,
        "data-site-base": siteBase,
        "data-route-path": routePath
      },
      children: [
        {
          type: "element",
          tagName: "div",
          properties: { className: ["hd-ai-row"] },
          children: buttons
        },
        {
          type: "element",
          tagName: "div",
          properties: { className: ["hd-ai-note"] },
          children: [
            {
              type: "text",
              value: "提示：AI 结果必须带引用；若证据不足会提示“未找到可靠证据”。"
            }
          ]
        },
        {
          type: "element",
          tagName: "div",
          properties: { className: ["hd-ai-output"] },
          children: [
            { type: "element", tagName: "div", properties: { className: ["hd-ai-answer"] }, children: [] },
            { type: "element", tagName: "ol", properties: { className: ["hd-ai-cites"] }, children: [] }
          ]
        },
        { type: "element", tagName: "style", properties: {}, children: [{ type: "text", value: style }] },
        { type: "element", tagName: "script", properties: { type: "module" }, children: [{ type: "text", value: script }] }
      ]
    });
  };
}

function buttonNode(label: string, action: string): any {
  return {
    type: "element",
    tagName: "button",
    properties: { type: "button", "data-action": action },
    children: [{ type: "text", value: label }]
  };
}

function buildClientScript(opts: {
  panelId: string;
  endpointBase: string;
  siteBase: string;
  routePath: string;
  enableDocQa: boolean;
  enableTranslate: boolean;
}): string {
  const { panelId } = opts;
  return `
(() => {
const root = document.getElementById(${JSON.stringify(panelId)});
if (!root) return;
const endpointBase = (root.getAttribute("data-endpoint-base") || "/seed").replace(/\\/+$/, "") || "/";
const siteBase = root.getAttribute("data-site-base") || "/";
const routePath = root.getAttribute("data-route-path") || "/";

const out = root.querySelector(".hd-ai-output");
const ansEl = root.querySelector(".hd-ai-answer");
const citesEl = root.querySelector(".hd-ai-cites");
const btns = Array.from(root.querySelectorAll("button[data-action]"));

function withBase(p){
  const base = siteBase === "/" ? "" : (siteBase.endsWith("/") ? siteBase.slice(0,-1) : siteBase);
  if (!p.startsWith("/")) p = "/" + p;
  return base + p;
}

function setLoading(on){
  for (const b of btns) b.disabled = !!on;
}

function openOutput(){
  if (out) out.classList.add("is-open");
}

function setOutput(answer, citations){
  openOutput();
  if (ansEl) ansEl.textContent = answer || "";
  if (citesEl) citesEl.innerHTML = "";
  const list = Array.isArray(citations) ? citations : [];
  for (let i=0;i<list.length;i++){
    const c = list[i] || {};
    const rp = String(c.routePath || "");
    const anchor = String(c.anchor || "");
    const title = String(c.title || rp || ("引用 " + (i+1)));
    const quote = String(c.quote || "");
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "hd-ai-cite-row";
    const a = document.createElement("a");
    const href = withBase((rp || "/").replace(/\\/+$/, "") + (anchor || ""));
    a.href = href;
    a.textContent = title;
    row.appendChild(a);

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "hd-ai-copy";
    copy.textContent = "复制链接";
    copy.addEventListener("click", async () => {
      try{
        await (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(location.origin + href) : Promise.reject(new Error("no clipboard")));
        copy.textContent = "已复制";
        setTimeout(()=>{copy.textContent="复制链接";}, 1200);
      } catch {
        window.prompt("复制链接：", location.origin + href);
      }
    });
    row.appendChild(copy);
    li.appendChild(row);
    if (quote){
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "证据片段（点击展开）";
      details.appendChild(summary);
      const pre = document.createElement("div");
      pre.className = "hd-ai-quote";
      pre.textContent = quote;
      details.appendChild(pre);
      li.appendChild(details);
    }
    citesEl && citesEl.appendChild(li);
  }
}

function getSelectionText(){
  const sel = window.getSelection ? window.getSelection() : null;
  const t = sel ? String(sel.toString() || "") : "";
  return t.trim();
}

function guessLang(text){
  const s = String(text || "");
  const hasCjk = /[\\u4e00-\\u9fff]/.test(s);
  return hasCjk ? {source:"zh", target:"en"} : {source:"en", target:"zh"};
}

async function postJson(path, body){
  const url = endpointBase.replace(/\\/+$/, "") + path;
  const resp = await fetch(url, {
    method:"POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body || {})
  });
  const data = await resp.json().catch(()=>null);
  if (!resp.ok || !data || data.success === false){
    const msg = data && data.message ? String(data.message) : ("HTTP " + resp.status);
    throw new Error(msg);
  }
  return data.data;
}

async function doAsk(){
  const q = window.prompt("问本文档：请输入问题");
  if (!q) return;
  setLoading(true);
  try{
    const data = await postJson("/api/v1/docqa/ask", {
      query: q,
      scope: { collections: [], routePaths: [routePath], categories: [], tags: [] },
      options: { k: 8, maxAnswerTokens: 800, language: "zh", style: "engineering", mustCite: true }
    });
    setOutput(data.answer || "", data.citations || []);
  } catch(e){
    setOutput("请求失败：" + (e && e.message ? e.message : String(e)), []);
  } finally {
    setLoading(false);
  }
}

async function doPage(task){
  setLoading(true);
  try{
    const data = await postJson("/api/v1/docqa/page", {
      routePath,
      task,
      options: { language: "zh", maxTokens: 600, mustCite: true }
    });
    setOutput(data.answer || "", data.citations || []);
  } catch(e){
    setOutput("请求失败：" + (e && e.message ? e.message : String(e)), []);
  } finally {
    setLoading(false);
  }
}

async function doTranslate(){
  const text = getSelectionText() || window.prompt("翻译：请输入要翻译的文本") || "";
  if (!text.trim()) return;
  const lang = guessLang(text);
  setLoading(true);
  try{
    const data = await postJson("/api/v1/translate", {
      text,
      source_language: lang.source,
      target_language: lang.target
    });
    setOutput(data.translated_text || "", []);
  } catch(e){
    setOutput("请求失败：" + (e && e.message ? e.message : String(e)), []);
  } finally {
    setLoading(false);
  }
}

root.addEventListener("click", (ev)=>{
  const t = ev.target;
  if (!t || !t.closest) return;
  const btn = t.closest("button[data-action]");
  if (!btn) return;
  const action = btn.getAttribute("data-action");
  if (action === "ask") return void doAsk();
  if (action === "summary") return void doPage("summary");
  if (action === "steps") return void doPage("steps");
  if (action === "translate") return void doTranslate();
});
})();
`.trim();
}
