import type { PluggableList } from "unified";

import type { ContentIndex, HotDocsConfig, RenderedPage } from "../types.js";

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
  routes?: {
    pages?: (ctx: RoutesHookContext) => Promise<PluginVirtualPage[]> | PluginVirtualPage[];
  };
  hooks?: {
    build?: (ctx: BuildHookContext) => Promise<void> | void;
  };
};

export type HotDocsPluginFactory = (options?: unknown) => HotDocsPlugin | Promise<HotDocsPlugin>;

export type PluginVirtualPage = Omit<RenderedPage, "hash"> & { hash?: string };

export type RoutesHookContext = {
  cwd: string;
  config: HotDocsConfig;
  index: ContentIndex;
};
