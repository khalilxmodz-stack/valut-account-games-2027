/* ============================================================
   EDIT YOUR DATA HERE
   ============================================================ */
const OWNER_EMAIL = "zinjackop@gmail.com";
const PLACEHOLDER_IMAGE = "assets/placeholder.svg"; // shown if an image is missing

// One line per account. Add, remove or edit lines freely.
const accounts = [
  { name: "Free Fire Account 1",   game: "Free Fire",   image: "assets/free_fire_1.jpg" },
  { name: "Free Fire Account 2",   game: "Free Fire",   image: "assets/free_fire_2.jpg" },
  { name: "Free Fire Account 3",   game: "Free Fire",   image: "assets/free_fire_3.jpg" },
  { name: "Free Fire Account 4",   game: "Free Fire",   image: "assets/free_fire_4.jpg" },
  { name: "Free Fire Account 5",   game: "Free Fire",   image: "assets/free_fire_5.jpg" },
  { name: "PUBG Mobile Account 1", game: "PUBG Mobile", image: "assets/pubg_1.jpg" },
  { name: "PUBG Mobile Account 2", game: "PUBG Mobile", image: "assets/pubg_2.jpg" },
  { name: "PUBG Mobile Account 3", game: "PUBG Mobile", image: "assets/pubg_3.jpg" },
  { name: "War Thunder Account 1", game: "War Thunder", image: "assets/war_thunder_1.jpg" },
  { name: "War Thunder Account 2", game: "War Thunder", image: "assets/war_thunder_2.jpg" },
      { name: "Pes 2026 Account 1", game: "Pes 2026", image: "assets/pes_1.jpg" },
  { name: "Pes 2026 Account 2", game: "Pes 2026", image: "assets/pes_2.jpg" }
];

// Filter tabs and their colour dots. Names must match "game" above.
const GAMES = {
  "Free Fire":   "#ff8a3d",
  "PUBG Mobile": "#f5c542",
  "War Thunder": "#5fd18b"
};

// Supporting companies. logo = image path (optional), url = website (optional).
const SUPPORTERS = [
  { name: "Company name 1", logo: "assets/supporters/company-1.png", url: "" },
  { name: "Company name 2", logo: "assets/supporters/company-2.png", url: "" },
  
];

// Permission documents. file = path to PDF/image (leave "" until you add it).
const DOCUMENTS = [
  { title: "Permission document 1", note: "Describe what it covers", file: "" },
  { title: "Permission document 2", note: "Describe what it covers", file: "" }
];

/* ============================================================
   ADS — set enabled:true and fill the slots you want.
   Slots: "top" (under the hero), "middle" (before Supporting companies), "bottom" (before footer).
   A slot with no settings (or enabled:false) stays hidden, so nothing empty ever shows.

   Slot types:
   1) Your own banner / sponsor (works immediately, no approval needed):
        top: { type: "banner", image: "assets/ads/banner.jpg", url: "https://sponsor.com", alt: "Sponsor name" }
   2) Google AdSense (needs an approved AdSense account and a real domain):
        ADSENSE_CLIENT = "ca-pub-1234567890123456";
        middle: { type: "adsense", slot: "1234567890" }
   ============================================================ */
const ADS = {
  enabled: false,
  slots: {
    top:    null,
    middle: null,
    bottom: null
  }
};
const ADSENSE_CLIENT = ""; // e.g. "ca-pub-1234567890123456"

/* ============================================================
   APP LOGIC (no need to edit below)
   ============================================================ */
const $ = (id) => document.getElementById(id);
const grid = $("grid"), filters = $("filters"), modal = $("modal"), toast = $("toast"), lb = $("lightbox");
let activeGame = "All", query = "", lastFocus = null;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function dot(game) {
  const d = el("span", "dot");
  d.style.background = GAMES[game] || "#8b5cf6";
  return d;
}
function safeImg(src, alt) {
  const img = el("img");
  img.src = src; img.alt = alt || ""; img.loading = "lazy";
  img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER_IMAGE; };
  return img;
}

/* ---------- hero ---------- */
function renderHero() {
  const stats = $("stats");
  Object.keys(GAMES).forEach((g) => {
    const n = accounts.filter((a) => a.game === g).length;
    const s = el("span", "stat");
    s.append(dot(g), el("b", "", n), document.createTextNode(" " + g));
    stats.appendChild(s);
  });
  const strip = $("strip");
  [...accounts, ...accounts].forEach((a) => strip.appendChild(safeImg(a.image, "")));
}

/* ---------- accounts ---------- */
function renderFilters() {
  filters.innerHTML = "";
  ["All", ...Object.keys(GAMES)].forEach((g) => {
    const b = el("button", "chip" + (g === activeGame ? " active" : ""));
    if (g !== "All") b.appendChild(dot(g));
    b.appendChild(document.createTextNode(g));
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", g === activeGame);
    b.onclick = () => { activeGame = g; renderFilters(); renderCards(); };
    filters.appendChild(b);
  });
}

function renderCards() {
  grid.innerHTML = "";
  const q = query.trim().toLowerCase();
  const list = accounts.filter((a) =>
    (activeGame === "All" || a.game === activeGame) &&
    (!q || (a.name + " " + a.game).toLowerCase().includes(q)));
  $("count").textContent = list.length + (list.length === 1 ? " account" : " accounts");
  if (!list.length) grid.appendChild(el("p", "empty", "No accounts match your search. Try another game or name."));

  list.forEach((a) => {
    const card = el("article", "card");
    const thumb = el("button", "thumb");
    thumb.setAttribute("aria-label", "View full image of " + a.name);
    thumb.dataset.label = "View image";
    thumb.appendChild(safeImg(a.image, a.name));
    thumb.onclick = () => openLightbox(a);

    const body = el("div", "body");
    const game = el("span", "game");
    game.append(dot(a.game), document.createTextNode(a.game));
    body.append(game, el("h3", "", a.name));

    const actions = el("div", "actions");
    const buy = el("button", "btn btn-primary", "Purchase");
    const swap = el("button", "btn btn-ghost", "Exchange");
    buy.onclick = () => openModal({ badge: "Purchase", title: a.name, meta: a.game,
      text: "Email the owner and mention this account's name to buy it.", subject: "Purchase: " + a.name });
    swap.onclick = () => openModal({ badge: "Exchange", title: a.name, meta: a.game,
      text: "Email the owner, mention this account's name and say what you want to exchange it for.", subject: "Exchange: " + a.name });
    actions.append(buy, swap);
    body.appendChild(actions);

    card.append(thumb, body);
    grid.appendChild(card);
  });
}

/* ---------- supporting companies ---------- */
function renderSupport() {
  const box = $("supporters");
  SUPPORTERS.forEach((s) => {
    const item = el(s.url ? "a" : "div", "logo");
    if (s.url) { item.href = s.url; item.target = "_blank"; item.rel = "noopener"; }
    const img = el("img"); img.src = s.logo; img.alt = s.name;
    img.onerror = () => img.replaceWith(el("span", "logo-init", s.name.trim().charAt(0).toUpperCase()));
    item.append(img, el("span", "", s.name));
    box.appendChild(item);
  });

  const list = $("docs");
  DOCUMENTS.forEach((d) => {
    const li = el("li");
    const row = el(d.file ? "a" : "div", "doc" + (d.file ? "" : " off"));
    if (d.file) { row.href = d.file; row.target = "_blank"; row.rel = "noopener"; }
    const info = el("div");
    info.append(el("b", "", d.title), el("small", "", d.file ? d.note : "Document not added yet"));
    row.append(el("span", "doc-ico", "DOC"), info);
    li.appendChild(row);
    list.appendChild(li);
  });

  $("money").onclick = () => openModal({ badge: "Money help", title: "Help with development", meta: "Support this project",
    text: "Contributions pay for hosting, new accounts and new features. Email the owner to arrange it.", subject: "Money help for development" });
}

/* ---------- ads ---------- */
function renderAds() {
  if (!ADS.enabled) return;
  document.querySelectorAll(".ad[data-ad]").forEach((wrap) => {
    const cfg = ADS.slots[wrap.dataset.ad];
    const box = wrap.querySelector(".ad-box");
    if (!cfg || !box) return;

    if (cfg.type === "banner" && cfg.image) {
      const img = el("img");
      img.src = cfg.image; img.alt = cfg.alt || "Advertisement"; img.loading = "lazy";
      img.style.cssText = "display:block;width:100%;max-width:728px;height:auto;margin:0 auto;border-radius:8px";
      img.onerror = () => { wrap.hidden = true; };           // hide the slot if the banner is missing
      if (cfg.url) {
        const a = el("a");
        a.style.cssText = "display:block;width:100%";
        a.href = cfg.url; a.target = "_blank"; a.rel = "sponsored noopener noreferrer";
        a.appendChild(img); box.appendChild(a);
      } else box.appendChild(img);
      wrap.hidden = false;
    } else if (cfg.type === "adsense" && ADSENSE_CLIENT && cfg.slot) {
      if (!document.querySelector("script[data-adsense]")) {
        const s = document.createElement("script");
        s.async = true; s.crossOrigin = "anonymous"; s.dataset.adsense = "1";
        s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADSENSE_CLIENT);
        document.head.appendChild(s);
      }
      const ins = el("ins", "adsbygoogle");
      ins.style.display = "block"; ins.style.width = "100%";
      ins.setAttribute("data-ad-client", ADSENSE_CLIENT);
      ins.setAttribute("data-ad-slot", cfg.slot);
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "true");
      box.appendChild(ins);
      wrap.hidden = false;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    }
  });
}

/* ---------- modal ---------- */
function openModal(o) {
  lastFocus = document.activeElement;
  $("m-action").textContent = o.badge;
  $("m-title").textContent = o.title;
  $("m-meta").textContent = o.meta;
  $("m-text").textContent = o.text;
  $("m-email").textContent = OWNER_EMAIL;
  $("m-mail").href = "mailto:" + OWNER_EMAIL + "?subject=" + encodeURIComponent(o.subject || "");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  $("m-copy").focus();
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}

function openLightbox(a) {
  lastFocus = document.activeElement;
  const img = $("lb-img");
  img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER_IMAGE; };
  img.src = a.image; img.alt = a.name;
  lb.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  lb.hidden = true;
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.remove("show"), 2000);
}

function copyEmail() {
  const done = () => showToast("Email copied");
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(OWNER_EMAIL).then(done, fallbackCopy);
  } else fallbackCopy();

  // Works when opened from your computer (file://)
  function fallbackCopy() {
    const t = document.createElement("textarea");
    t.value = OWNER_EMAIL;
    t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    try { document.execCommand("copy") ? done() : showToast("Copy failed. Select the email manually."); }
    catch (e) { showToast("Copy failed. Select the email manually."); }
    t.remove();
  }
}

modal.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) closeModal(); });
lb.addEventListener("click", closeLightbox);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!modal.hidden) closeModal();
  if (!lb.hidden) closeLightbox();
});
$("m-copy").onclick = copyEmail;
$("search").addEventListener("input", (e) => { query = e.target.value; renderCards(); });
$("year").textContent = new Date().getFullYear();

renderHero();
renderFilters();
renderCards();
renderSupport();
renderAds();
