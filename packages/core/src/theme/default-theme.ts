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
.hd-dir-title{
  font-size:12px;
  color:var(--hd-fg-2);
  text-transform:uppercase;
  letter-spacing:.12em;
  margin:8px 0 6px;
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
`;
