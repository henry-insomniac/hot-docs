export const DEFAULT_THEME_CSS = `
:root{
  --hd-bg-0:#0b0f14;
  --hd-bg-1:#0f1620;
  --hd-bg-2:#121b26;
  --hd-bg-3:#172234;
  --hd-fg-0:#e6edf3;
  --hd-fg-1:#a6b3c2;
  --hd-fg-2:#7f8b99;
  --hd-border-0:rgba(255,255,255,.08);
  --hd-border-1:rgba(255,255,255,.12);
  --hd-accent:#7c3aed;
  --hd-accent-2:#22d3ee;
  --hd-glow:rgba(124,58,237,.25);
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  background:radial-gradient(1200px 600px at 10% 0%, rgba(124,58,237,.12), transparent 55%),
             radial-gradient(900px 500px at 100% 30%, rgba(34,211,238,.10), transparent 60%),
             var(--hd-bg-0);
  color:var(--hd-fg-0);
  font:14px/1.65 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
}
a{color:var(--hd-accent-2); text-decoration:none}
a:hover{color:#7ef0ff}
#hd-app{
  display:grid;
  grid-template-columns: 280px 1fr;
  min-height:100vh;
}
#hd-app.hd-has-toc{
  grid-template-columns: 280px 1fr 240px;
}
#hd-sidebar{
  padding:16px;
  background:linear-gradient(180deg, rgba(18,27,38,.92), rgba(15,22,32,.92));
  border-right:1px solid var(--hd-border-0);
  position:sticky;
  top:0;
  max-height:100vh;
  overflow:auto;
}
#hd-main{
  padding:16px 22px 60px;
}
#hd-toc{
  display:none;
  padding:16px 14px;
  background:linear-gradient(180deg, rgba(18,27,38,.45), rgba(15,22,32,.30));
  border-left:1px solid var(--hd-border-0);
}
#hd-app.hd-has-toc #hd-toc{
  display:block;
}
.hd-toc-inner{
  position:sticky;
  top:88px;
}
.hd-toc-title{
  font-size:12px;
  color:var(--hd-fg-2);
  text-transform:uppercase;
  letter-spacing:.12em;
  margin:6px 0 10px;
}
.hd-toc-list{
  list-style:none;
  padding-left:0;
  margin:0;
  display:flex;
  flex-direction:column;
  gap:6px;
}
.hd-toc-item a{
  display:block;
  padding:6px 8px;
  border-radius:10px;
  color:var(--hd-fg-2);
  border:1px solid transparent;
}
.hd-toc-item a:hover{
  color:var(--hd-fg-0);
  border-color:rgba(34,211,238,.14);
  background:rgba(23,34,52,.45);
}
.hd-toc-level-3 a{padding-left:18px}
.hd-toc-level-4 a{padding-left:28px}
.hd-toc-level-5 a{padding-left:38px}
.hd-toc-level-6 a{padding-left:48px}
@media (max-width: 1100px){
  #hd-app.hd-has-toc{grid-template-columns: 280px 1fr}
  #hd-toc{display:none}
}
#hd-header{
  position:sticky;
  top:0;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  backdrop-filter: blur(10px);
  background:rgba(11,15,20,.6);
  border:1px solid var(--hd-border-0);
  box-shadow:0 0 0 1px rgba(124,58,237,.06), 0 10px 30px rgba(0,0,0,.35);
  border-radius:12px;
  padding:10px 14px;
  margin-bottom:16px;
}
#hd-brand,#hd-brand a{
  font-weight:600;
  letter-spacing:.2px;
  color:var(--hd-fg-0);
}
.hd-header-actions{
  margin-left:auto;
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
  justify-content:flex-end;
}
.hd-header-links{
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:wrap;
}
.hd-header-link{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:30px;
  padding:5px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.14);
  color:var(--hd-fg-1);
  background:rgba(23,34,52,.35);
}
.hd-header-link:hover{
  color:var(--hd-fg-0);
  border-color:rgba(34,211,238,.25);
  box-shadow:0 0 0 1px rgba(34,211,238,.12);
}
.hd-header-link.is-active{
  color:var(--hd-fg-0);
  border-color:rgba(124,58,237,.45);
  background:rgba(23,34,52,.75);
}
.hd-focus-toggle{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:30px;
  padding:5px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.14);
  color:var(--hd-fg-1);
  background:rgba(23,34,52,.25);
  cursor:pointer;
}
.hd-focus-toggle:hover{
  color:var(--hd-fg-0);
  border-color:rgba(124,58,237,.30);
}
.hd-focus-toggle[aria-pressed="true"]{
  color:var(--hd-fg-0);
  border-color:rgba(124,58,237,.45);
  background:rgba(23,34,52,.75);
}
#hd-content{
  max-width: 980px;
  background:rgba(18,27,38,.60);
  border:1px solid var(--hd-border-0);
  box-shadow:0 0 0 1px rgba(34,211,238,.05), 0 18px 60px rgba(0,0,0,.35);
  border-radius:14px;
  padding:22px 22px;
}
.hd-list{list-style:none; padding-left:0; margin:0}
.hd-root{display:flex; flex-direction:column; gap:10px}
.hd-nav-tools{
  margin:0 0 12px;
}
.hd-nav-filter{
  width:100%;
  padding:9px 10px;
  border-radius:10px;
  border:1px solid var(--hd-border-1);
  background:rgba(11,15,20,.45);
  color:var(--hd-fg-0);
  outline:none;
}
.hd-nav-filter:focus{
  border-color:rgba(34,211,238,.25);
  box-shadow:0 0 0 3px rgba(34,211,238,.10);
}
.hd-nav-cats{
  margin:0 0 14px;
  padding:8px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(23,34,52,.25);
}
.hd-nav-chips{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
}
.hd-nav-chip{
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:4px 8px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  color:var(--hd-fg-1);
  background:rgba(11,15,20,.35);
  font-size:12px;
}
.hd-nav-chip small{
  opacity:.72;
}
.hd-nav-chip.is-active{
  color:var(--hd-fg-0);
  border-color:rgba(124,58,237,.40);
}
.hd-dir-title{
  font-size:12px;
  color:var(--hd-fg-2);
  text-transform:uppercase;
  letter-spacing:.12em;
  margin:8px 0 6px;
}
.hd-dir-details{
  border:1px solid rgba(255,255,255,.06);
  border-radius:12px;
  padding:2px 0 8px;
  background:rgba(11,15,20,.28);
}
.hd-dir-details > .hd-dir-title{
  margin:0;
  padding:8px 10px;
  cursor:pointer;
  list-style:none;
}
.hd-dir-details > .hd-dir-title::-webkit-details-marker{
  display:none;
}
.hd-dir-details > .hd-dir-title::before{
  content:"▸";
  display:inline-block;
  margin-right:6px;
  transform-origin:center;
  transition:transform .15s ease;
}
.hd-dir-details[open] > .hd-dir-title::before{
  transform:rotate(90deg);
}
.hd-dir-details > .hd-list{
  padding:0 6px;
}
.hd-item a{
  display:block;
  padding:8px 10px;
  border:1px solid transparent;
  border-radius:10px;
  color:var(--hd-fg-1);
}
.hd-item a:hover{
  background:rgba(23,34,52,.65);
  border-color:rgba(34,211,238,.18);
  box-shadow:0 0 0 1px rgba(124,58,237,.10), 0 0 20px rgba(124,58,237,.10);
  color:var(--hd-fg-0);
}
.hd-active a{
  background:rgba(23,34,52,.85);
  border-color:rgba(124,58,237,.35);
  box-shadow:0 0 0 1px rgba(124,58,237,.18), 0 0 22px rgba(124,58,237,.18);
  color:var(--hd-fg-0);
}
body.hd-focus-mode #hd-sidebar,
body.hd-focus-mode #hd-toc{
  display:none !important;
}
body.hd-focus-mode #hd-app,
body.hd-focus-mode #hd-app.hd-has-toc{
  grid-template-columns:1fr;
}
body.hd-focus-mode #hd-main{
  max-width:980px;
  margin:0 auto;
  padding:16px 0 60px;
}
article h1,article h2,article h3{scroll-margin-top:90px}
article h1{font-size:28px; margin:0 0 12px}
article h2{font-size:20px; margin:28px 0 10px}
article p{color:var(--hd-fg-1)}
article code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  background:rgba(0,0,0,.22);
  border:1px solid rgba(255,255,255,.08);
  padding:2px 6px;
  border-radius:8px;
}
article pre{
  background:rgba(0,0,0,.35);
  border:1px solid rgba(255,255,255,.10);
  border-radius:12px;
  padding:14px;
  overflow:auto;
}
article input[type="search"], article input[type="text"]{
  width:min(560px, 100%);
  padding:10px 12px;
  border-radius:12px;
  border:1px solid var(--hd-border-1);
  background:rgba(11,15,20,.45);
  color:var(--hd-fg-0);
  outline:none;
}
article input[type="search"]:focus, article input[type="text"]:focus{
  border-color:rgba(34,211,238,.25);
  box-shadow:0 0 0 3px rgba(34,211,238,.10);
}
.hd-search-results{list-style:none; padding-left:0; margin:12px 0 0; display:flex; flex-direction:column; gap:10px}
.hd-search-item a{
  display:block;
  padding:10px 12px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.10);
  background:rgba(23,34,52,.35);
  color:var(--hd-fg-0);
}
.hd-search-item a:hover{
  border-color:rgba(124,58,237,.35);
  box-shadow:0 0 0 1px rgba(124,58,237,.12), 0 0 20px rgba(124,58,237,.10);
}
.hd-search-summary{margin-top:6px; color:var(--hd-fg-1); font-size:12px}
.hd-blog-list{list-style:none; padding-left:0; margin:16px 0; display:flex; flex-direction:column; gap:12px}
.hd-blog-item{
  display:flex;
  gap:12px;
  padding:12px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.10);
  background:rgba(23,34,52,.35);
}
.hd-blog-item:hover{
  border-color:rgba(124,58,237,.35);
  box-shadow:0 0 0 1px rgba(124,58,237,.12), 0 0 24px rgba(124,58,237,.10);
}
.hd-blog-cover{
  display:block;
  width:180px;
  flex:0 0 180px;
  aspect-ratio: 16 / 10;
  border-radius:12px;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.10);
  background:rgba(0,0,0,.22);
}
.hd-blog-cover img{width:100%; height:100%; object-fit:cover; display:block}
.hd-blog-meta{min-width:0; flex:1; display:flex; flex-direction:column; gap:6px}
.hd-blog-title{font-size:16px; font-weight:600; color:var(--hd-fg-0)}
.hd-blog-title:hover{color:#fff}
.hd-blog-sub{color:var(--hd-fg-2)}
.hd-blog-summary{color:var(--hd-fg-1); font-size:13px}
.hd-blog-draft{color:var(--hd-accent-2)}
@media (max-width: 640px){
  .hd-blog-item{flex-direction:column}
  .hd-blog-cover{width:100%; flex-basis:auto}
  #hd-header{
    align-items:flex-start;
    flex-direction:column;
  }
  .hd-header-actions{
    width:100%;
    justify-content:flex-start;
  }
  .hd-header-links{
    width:100%;
  }
  .hd-focus-toggle{
    width:100%;
  }
}
`;
