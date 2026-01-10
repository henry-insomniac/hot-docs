export type CollectionType = "docs" | "blog" | "pages";

export type CollectionConfig = {
  dir: string;
  routeBase: string;
  type: CollectionType;
};

export type HotDocsPluginRef =
  | string
  | { name: string; options?: Record<string, unknown> }
  | { path: string; options?: Record<string, unknown> };

export type HotDocsConfig = {
  contentDir: string;
  collections: Record<string, CollectionConfig>;
  site: {
    title: string;
    base: string;
  };
  theme?: {
    name?: string;
    tokens?: Record<string, string>;
  };
  plugins?: HotDocsPluginRef[];
  dev?: {
    port?: number;
    host?: string;
    open?: boolean;
    includeDrafts?: boolean;
    strictPort?: boolean;
  };
};

export type ContentEntry = {
  id: string;
  collection: string;
  relativePath: string;
  routePath: string;
  title: string;
  description?: string;
  summary?: string;
  order?: number;
  tags?: string[];
  category?: string;
  date?: string;
  updated?: string;
  draft?: boolean;
  mtimeMs: number;
  hash: string;
};

export type NavNode = {
  type: "dir" | "page";
  title: string;
  pathSegment: string;
  routePath?: string;
  children?: NavNode[];
};

export type ContentIndex = {
  entriesByRoute: Map<string, ContentEntry>;
  entriesById: Map<string, ContentEntry>;
  navTreeByCollection: Map<string, NavNode>;
};

export type RenderedPage = {
  routePath: string;
  title: string;
  html: string;
  hash: string;
};
