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
  grid-template-columns: 252px 1fr;
  min-height:100vh;
}
#hd-app.hd-has-toc{
  grid-template-columns: 252px 1fr 220px;
}
#hd-sidebar{
  position:sticky;
  top:0;
  max-height:100vh;
  overflow:auto;
  padding:14px 12px;
  background:linear-gradient(180deg, rgba(18,27,38,.86), rgba(15,22,32,.90));
  border-right:1px solid var(--hd-border-0);
}
#hd-main{
  padding:14px 18px 56px;
}
#hd-toc{
  display:none;
  padding:14px 12px;
  background:linear-gradient(180deg, rgba(18,27,38,.30), rgba(15,22,32,.22));
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
  font-size:11px;
  color:var(--hd-fg-2);
  text-transform:uppercase;
  letter-spacing:.14em;
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
  padding:5px 7px;
  border-radius:8px;
  color:var(--hd-fg-2);
  border:1px solid transparent;
  font-size:13px;
}
.hd-toc-item a:hover{
  color:var(--hd-fg-0);
  border-color:rgba(34,211,238,.10);
  background:rgba(23,34,52,.30);
}
.hd-toc-level-3 a{padding-left:18px}
.hd-toc-level-4 a{padding-left:28px}
.hd-toc-level-5 a{padding-left:38px}
.hd-toc-level-6 a{padding-left:48px}
@media (max-width: 1100px){
  #hd-app.hd-has-toc{grid-template-columns: 252px 1fr}
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
  background:rgba(11,15,20,.55);
  border:1px solid var(--hd-border-0);
  box-shadow:0 0 0 1px rgba(124,58,237,.04), 0 8px 22px rgba(0,0,0,.28);
  border-radius:12px;
  padding:9px 12px;
  margin-bottom:12px;
}
#hd-brand,#hd-brand a{
  font-weight:600;
  letter-spacing:.1px;
  color:var(--hd-fg-0);
}
.hd-header-links{
  display:flex;
  gap:6px;
  align-items:center;
  flex-wrap:wrap;
}
.hd-header-link{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:28px;
  padding:4px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  color:var(--hd-fg-1);
  background:rgba(23,34,52,.25);
  font-size:13px;
}
.hd-header-link:hover{
  color:var(--hd-fg-0);
  border-color:rgba(34,211,238,.18);
}
.hd-header-link.is-active{
  color:var(--hd-fg-0);
  border-color:rgba(124,58,237,.30);
  background:rgba(23,34,52,.55);
}
#hd-content{
  max-width: 900px;
  background:rgba(18,27,38,.58);
  border:1px solid var(--hd-border-0);
  box-shadow:0 0 0 1px rgba(34,211,238,.03), 0 14px 44px rgba(0,0,0,.30);
  border-radius:14px;
  padding:24px 26px;
}
.hd-list{list-style:none; padding-left:0; margin:0}
.hd-root{display:flex; flex-direction:column; gap:8px}
.hd-dir{
  margin:0;
}
.hd-dir-details{
  margin:0;
  border:0;
}
.hd-dir-details > .hd-list{
  margin-top:6px;
}
.hd-dir-title{
  display:flex;
  align-items:center;
  gap:6px;
  font-size:11px;
  color:var(--hd-fg-2);
  text-transform:uppercase;
  letter-spacing:.14em;
  margin:4px 0 2px;
  padding:6px 8px;
  border-radius:8px;
  user-select:none;
  cursor:pointer;
  list-style:none;
}
.hd-dir-title::-webkit-details-marker{
  display:none;
}
.hd-dir-title::before{
  content:"▸";
  opacity:.75;
  transform-origin:center;
  transition:transform .16s ease;
}
.hd-dir-details[open] > .hd-dir-title::before{
  transform:rotate(90deg);
}
.hd-dir-active > .hd-dir-details > .hd-dir-title{
  color:var(--hd-fg-1);
  background:rgba(23,34,52,.26);
}
.hd-item a{
  display:block;
  padding:7px 10px;
  border:1px solid transparent;
  border-radius:8px;
  color:var(--hd-fg-1);
  font-size:13px;
  line-height:1.45;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
.hd-item a:hover{
  background:rgba(23,34,52,.48);
  border-color:rgba(34,211,238,.10);
  color:var(--hd-fg-0);
}
.hd-active a{
  background:rgba(23,34,52,.60);
  border-color:rgba(124,58,237,.26);
  color:var(--hd-fg-0);
  box-shadow:none;
}
article h1,article h2,article h3{scroll-margin-top:90px}
article h1{font-size:30px; line-height:1.3; margin:0 0 14px}
article h2{font-size:21px; line-height:1.35; margin:30px 0 12px}
article h3{font-size:17px; line-height:1.4}
article p,article li{color:#c2cedc}
article p{line-height:1.78}
article code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  background:rgba(0,0,0,.18);
  border:1px solid rgba(255,255,255,.08);
  padding:2px 6px;
  border-radius:8px;
}
article pre{
  background:rgba(0,0,0,.28);
  border:1px solid rgba(255,255,255,.09);
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
@media (max-width: 1300px){
  #hd-app{grid-template-columns: 236px 1fr}
  #hd-app.hd-has-toc{grid-template-columns: 236px 1fr 208px}
}
@media (max-width: 640px){
  .hd-blog-item{flex-direction:column}
  .hd-blog-cover{width:100%; flex-basis:auto}
  #hd-header{
    align-items:flex-start;
    flex-direction:column;
  }
  .hd-header-links{
    width:100%;
  }
}
`;
