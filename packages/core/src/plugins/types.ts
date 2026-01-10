import type { PluggableList } from "unified";

import type { ContentIndex, HotDocsConfig } from "../types.js";

export type BuildHookContext = {
  cwd: string;
  outDir: string;
  config: HotDocsConfig;
  index: ContentIndex;
  emitFile: (relativePath: string, content: string | Uint8Array) => Promise<void>;
};

export type HotDocsPlugin = {
  name: string;
  apiVersion: 1;
  capabilities?: string[];
  markdown?: {
    remarkPlugins?: PluggableList;
    rehypePlugins?: PluggableList;
  };
  hooks?: {
    build?: (ctx: BuildHookContext) => Promise<void> | void;
  };
};

export type HotDocsPluginFactory = (options?: unknown) => HotDocsPlugin | Promise<HotDocsPlugin>;

