
"use strict";

const NASA_KEY = "DEMO_KEY"; 
const API = {
  apod: "https://api.nasa.gov/planetary/apod",
  launches: "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=detailed",
  planets: "https://api.le-systeme-solaire.net/rest/bodies?filter%5B%5D=isPlanet,eq,true",
};


const $ = (id) => document.getElementById(id);

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));


async function getJSON(url, ttl = 0) {
  const key = "cosmos:" + url;
  if (ttl) {
    try {
      const c = JSON.parse(sessionStorage.getItem(key));
      if (c && Date.now() - c.t < ttl) return c.d;
    } catch (e) {}
  }
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    if (res.status === 429) {
      msg = "Too many requests. Please wait a moment and try again.";
    } else {
      try {
        const b = await res.json();
        msg = (b && ((b.error && b.error.message) || b.msg || b.detail)) || msg;
      } catch (e) {}
    }
    throw new Error(msg);
  }
  const data = await res.json();
  if (ttl) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data }));
    } catch (e) {}
  }
  return data;
}

const fmt = (n, d = 0) =>
  n == null || isNaN(n) ? "N/A" : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const sup = (n) => String(n).split("").map((c) => SUP[c] || c).join("");
const sci = (v, e, unit) => (v == null ? "N/A" : `${Number(v).toFixed(2)} × 10${sup(e)} ${unit}`);
const millions = (km) => (km == null ? "N/A" : `${(km / 1e6).toFixed(1)}M km`);

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const longDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const utcDateLong = (net) =>
  new Date(net).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const utcDateShort = (net) =>
  new Date(net).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
const utcTime = (net) =>
  new Date(net).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

const heart = (on) => (on ? '<i class="fas fa-heart c-red" style="color:#f87171"></i>' : '<i class="far fa-heart"></i>');

const errorBlock = (msg, retry) =>
  `<div class="state"><i class="fas fa-triangle-exclamation warn"></i><p>${esc(msg)}</p>
   <button class="btn-primary" data-retry="${retry}">Try again</button></div>`;

function showSection(id) {
  document.querySelectorAll(".app-section").forEach((s) => s.classList.toggle("hidden", s.id !== id));
  document.querySelectorAll(".nav-link").forEach((a) => a.classList.toggle("active", a.dataset.section === id));
  closeSidebar();
  window.scrollTo({ top: 0 });
}
function openSidebar() {
  $("sidebar").classList.add("open");
  $("overlay").classList.add("show");
}
function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("overlay").classList.remove("show");
}

let apodHD = "";

function apodLoading() {
  $("apod-loading").classList.remove("hidden");
  $("apod-loading").innerHTML = `<i class="fas fa-spinner fa-spin"></i><p>Loading image...</p>`;
  $("apod-image").classList.add("hidden");
  const f = $("apod-image-container").querySelector("iframe");
  if (f) f.remove();
}

async function loadAPOD(date) {
  apodLoading();
  try {
    const url = `${API.apod}?api_key=${NASA_KEY}${date ? `&date=${date}` : ""}`;
    renderAPOD(await getJSON(url, 30 * 60 * 1000));
  } catch (err) {
    $("apod-loading").innerHTML = errorBlock(err.message, "apod");
  }
}

function renderAPOD(d) {
  const long = longDate(d.date);
  const box = $("apod-image-container");
  const img = $("apod-image");
  const overlay = box.querySelector(".apod-overlay");
  apodHD = d.hdurl || d.url;

  const old = box.querySelector("iframe");
  if (old) old.remove();

  if (d.media_type === "video") {
    img.classList.add("hidden");
    overlay.classList.add("hidden");
    const f = document.createElement("iframe");
    f.src = d.url;
    f.title = d.title;
    f.className = "apod-frame";
    f.setAttribute("allowfullscreen", "");
    box.appendChild(f);
  } else {
    overlay.classList.remove("hidden");
    img.src = d.url;
    img.alt = d.title;
    img.classList.remove("hidden");
  }
  $("apod-loading").classList.add("hidden");

  $("apod-title").textContent = d.title;
  $("apod-date").textContent = `Astronomy Picture of the Day - ${long}`;
  $("apod-date-detail").innerHTML = `<i class="far fa-calendar"></i> ${esc(long)}`;
  $("apod-explanation").textContent = d.explanation || "";
  $("apod-date-info").textContent = long;
  $("apod-media-type").textContent = d.media_type === "video" ? "Video" : "Image";
  $("apod-date-input").value = d.date;

  const cr = $("apod-copyright");
  if (d.copyright) {
    cr.textContent = "© " + d.copyright.replace(/\s+/g, " ").trim();
    cr.classList.remove("hidden");
  } else {
    cr.classList.add("hidden");
  }
}

function initAPOD() {
  const input = $("apod-date-input");
  input.max = toISO(new Date());
  $("load-date-btn").addEventListener("click", () => input.value && loadAPOD(input.value));
  // "Today" بدون تاريخ: الـ API نفسه بيجيب آخر صورة متاحة
  $("today-apod-btn").addEventListener("click", () => loadAPOD());
  $("apod-hd-btn").addEventListener("click", () => apodHD && window.open(apodHD, "_blank", "noopener"));
  loadAPOD();
}

let launches = [];

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch (e) {
    return null;
  }
})();
const ISO3 = { USA: "US", NZL: "NZ", CHN: "CN", RUS: "RU", FRA: "FR", GUF: "GF", IND: "IN", JPN: "JP", KAZ: "KZ", NOR: "NO", GBR: "GB", KOR: "KR", ISR: "IL", IRN: "IR", AUS: "AU", BRA: "BR" };

function countryName(l) {
  const loc = l.pad && l.pad.location;
  if (loc && loc.country && loc.country.name) return loc.country.name;
  const code = loc && loc.country_code;
  if (!code) return "Unknown";
  try {
    return (ISO3[code] && regionNames && regionNames.of(ISO3[code])) || code;
  } catch (e) {
    return code;
  }
}

function statusClass(abbrev = "") {
  const s = abbrev.toLowerCase();
  if (s === "go" || s === "success") return "st-go";
  if (s.includes("fail") || s === "hold") return "st-bad";
  if (s.includes("flight")) return "st-info";
  return "st-warn"; // TBC / TBD
}

function mapLaunch(l) {
  const cfg = (l.rocket && l.rocket.configuration) || {};
  const mission = l.mission || {};
  const loc = (l.pad && l.pad.location) || {};
  return {
    id: l.id,
    name: l.name,
    status: (l.status && l.status.abbrev) || "TBD",
    statusFull: (l.status && l.status.name) || "To be determined",
    provider: (l.launch_service_provider && l.launch_service_provider.name) || "Unknown",
    rocket: cfg.name || "Unknown",
    net: l.net,
    pad: (l.pad && l.pad.name) || "",
    location: loc.name || "Unknown",
    country: countryName(l),
    description: mission.description || "No description available yet.",
    missionName: mission.name || "",
    missionType: mission.type || "",
    orbit: (mission.orbit && mission.orbit.name) || "",
    image: (typeof l.image === "string" ? l.image : l.image && l.image.image_url) || "",
    info: (l.info_urls && l.info_urls[0] && l.info_urls[0].url) || "",
    video: (l.vid_urls && l.vid_urls[0] && l.vid_urls[0].url) || "",
  };
}

const daysUntil = (net) => Math.max(0, Math.ceil((new Date(net) - new Date()) / 86400000));

async function loadLaunches() {
  $("featured-launch").innerHTML = `<div class="state"><i class="fas fa-spinner fa-spin"></i><p>Loading launches...</p></div>`;
  $("launches-grid").innerHTML = "";
  try {
    const data = await getJSON(API.launches, 10 * 60 * 1000);
    launches = (data.results || []).map(mapLaunch);
    $("launches-count").textContent = launches.length;
    renderLaunches();
  } catch (err) {
    $("featured-launch").innerHTML = errorBlock(err.message, "launches");
  }
}

function renderLaunches() {
  if (!launches.length) {
    $("featured-launch").innerHTML = `<p class="muted">No upcoming launches found.</p>`;
    return;
  }
  $("featured-launch").innerHTML = featuredHTML(launches[0]);
  $("launches-grid").innerHTML = launches.slice(1).map(cardHTML).join("");
}

function featuredHTML(l) {
  return `
  <div class="featured">
    <div>
      <div class="chips">
        <span class="chip"><i class="fas fa-star"></i> Featured Launch</span>
        <span class="chip status ${statusClass(l.status)}">${esc(l.status)}</span>
      </div>
      <h3 class="featured-title">${esc(l.name)}</h3>
      <div class="meta-row">
        <span><i class="fas fa-building"></i> ${esc(l.provider)}</span>
        <span><i class="fas fa-rocket"></i> ${esc(l.rocket)}</span>
      </div>
      <div class="countdown">
        <i class="fas fa-clock"></i>
        <div><b>${daysUntil(l.net)}</b><small>Days Until Launch</small></div>
      </div>
      <div class="info-grid">
        <div class="info-box"><p><i class="fas fa-calendar"></i> Launch Date</p><b>${utcDateLong(l.net)}</b></div>
        <div class="info-box"><p><i class="fas fa-clock"></i> Launch Time</p><b>${utcTime(l.net)}</b></div>
        <div class="info-box"><p><i class="fas fa-map-marker-alt"></i> Location</p><b>${esc(l.location)}</b></div>
        <div class="info-box"><p><i class="fas fa-globe"></i> Country</p><b>${esc(l.country)}</b></div>
      </div>
      <p class="featured-desc">${esc(l.description)}</p>
      <div class="actions">
        <button class="btn-primary" data-details="${esc(l.id)}"><i class="fas fa-info-circle"></i> View Full Details</button>
        <div class="group">
          <button class="icon-btn" data-fav>${heart(false)}</button>
          <button class="icon-btn" data-bell><i class="fas fa-bell"></i></button>
        </div>
      </div>
    </div>
    <div class="featured-media">
      <i class="fas fa-rocket"></i>
      ${l.image ? `<img src="${esc(l.image)}" alt="${esc(l.name)}" loading="lazy" onerror="this.remove()" />` : ""}
    </div>
  </div>`;
}

function cardHTML(l) {
  return `
  <div class="launch-card" data-details="${esc(l.id)}">
    <div class="lc-media">
      <i class="fas fa-rocket"></i>
      ${l.image ? `<img src="${esc(l.image)}" alt="${esc(l.name)}" loading="lazy" onerror="this.remove()" />` : ""}
      <span class="lc-badge ${statusClass(l.status)}">${esc(l.status)}</span>
    </div>
    <div class="lc-body">
      <h4 class="lc-title">${esc(l.name)}</h4>
      <p class="lc-provider"><i class="fas fa-building"></i> ${esc(l.provider)}</p>
      <div class="lc-line"><i class="fas fa-calendar"></i><span>${utcDateShort(l.net)}</span></div>
      <div class="lc-line"><i class="fas fa-clock"></i><span>${utcTime(l.net)}</span></div>
      <div class="lc-line"><i class="fas fa-rocket"></i><span>${esc(l.rocket)}</span></div>
      <div class="lc-line"><i class="fas fa-map-marker-alt"></i><span>${esc(l.location)}</span></div>
      <div class="lc-actions">
        <button class="more">Details</button>
        <button class="icon-btn" data-fav>${heart(false)}</button>
      </div>
    </div>
  </div>`;
}

function openLaunchModal(l) {
  closeLaunchModal();
  const row = (label, val) =>
    val ? `<div class="kv line"><span>${label}</span><b>${esc(val)}</b></div>` : "";
  const link = (href, icon, text) =>
    href ? `<a href="${esc(href)}" target="_blank" rel="noopener"><i class="${icon}"></i> ${text}</a>` : "";

  const m = document.createElement("div");
  m.id = "launch-modal";
  m.className = "modal";
  m.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" data-close-modal><i class="fas fa-times"></i></button>
      ${l.image ? `<img src="${esc(l.image)}" alt="${esc(l.name)}" onerror="this.remove()" />` : ""}
      <div class="modal-body">
        <span class="${statusClass(l.status)}" style="font-weight:600;font-size:14px">${esc(l.statusFull)}</span>
        <h3>${esc(l.name)}</h3>
        <p class="text-body">${esc(l.description)}</p>
        ${row("Provider", l.provider)}
        ${row("Rocket", l.rocket)}
        ${row("Date", utcDateLong(l.net))}
        ${row("Time", utcTime(l.net))}
        ${row("Pad", l.pad)}
        ${row("Location", l.location)}
        ${row("Country", l.country)}
        ${row("Mission", l.missionName)}
        ${row("Mission type", l.missionType)}
        ${row("Orbit", l.orbit)}
        <div class="modal-links">${link(l.info, "fas fa-link", "More info")}${link(l.video, "fas fa-video", "Watch")}</div>
      </div>
    </div>`;
  m.addEventListener("click", (e) => e.target === m && closeLaunchModal());
  document.body.appendChild(m);
}
function closeLaunchModal() {
  const m = $("launch-modal");
  if (m) m.remove();
}

const AU = 149597870.7;


const PLANETS = [
  { id: "mercury", name: "Mercury", au: 0.39, c1: "#d1d5db", c2: "#6b7280", color: "#9ca3af", type: "Terrestrial",
    desc: "Mercury is the smallest planet in the Solar System and the closest to the Sun. It has almost no atmosphere, so its surface swings between scorching days and freezing nights." },
  { id: "venus", name: "Venus", au: 0.72, c1: "#fdba74", c2: "#c2410c", color: "#f97316", type: "Terrestrial",
    desc: "Venus is the second planet from the Sun and the hottest in the Solar System, thanks to a thick carbon dioxide atmosphere that traps heat. It spins backwards compared to most planets." },
  { id: "earth", name: "Earth", au: 1.0, c1: "#7dd3fc", c2: "#1d4ed8", color: "#3b82f6", type: "Terrestrial",
    desc: "Earth is the third planet from the Sun and the only astronomical object known to harbor life. About 29% of its surface is land, and the remaining 71% is covered with water." },
  { id: "mars", name: "Mars", au: 1.52, c1: "#fca5a5", c2: "#b91c1c", color: "#ef4444", type: "Terrestrial",
    desc: "Mars is the fourth planet from the Sun, a cold desert world with the tallest volcano in the Solar System, Olympus Mons. Its red color comes from iron oxide on the surface." },
  { id: "jupiter", name: "Jupiter", au: 5.2, c1: "#fde0b6", c2: "#c2773a", color: "#fb923c", type: "Gas Giant",
    desc: "Jupiter is the largest planet in the Solar System, a gas giant with a mass more than twice that of all other planets combined. Its Great Red Spot is a storm larger than Earth." },
  { id: "saturn", name: "Saturn", au: 9.54, c1: "#fef08a", c2: "#a16207", color: "#facc15", type: "Gas Giant",
    desc: "Saturn is the sixth planet from the Sun, a gas giant best known for its spectacular system of rings made mostly of ice particles. It is the least dense planet in the Solar System." },
  { id: "uranus", name: "Uranus", au: 19.19, c1: "#a5f3fc", c2: "#0e7490", color: "#06b6d4", type: "Ice Giant",
    desc: "Uranus is an ice giant that rotates on its side, with an axial tilt of about 98 degrees. Methane in its atmosphere gives it a pale blue-green color." },
  { id: "neptune", name: "Neptune", au: 30.07, c1: "#93c5fd", c2: "#1e3a8a", color: "#2563eb", type: "Ice Giant",
    desc: "Neptune is the farthest known planet from the Sun, a cold and windy ice giant with the fastest winds in the Solar System. It was found through mathematical predictions before it was seen." },
];

const planetData = {}; 
let selectedPlanet = "earth";

const typeClass = (t) => (t === "Gas Giant" ? "t-gas" : t === "Ice Giant" ? "t-ice" : "t-terrestrial");
const orbHTML = (p, extra = "") =>
  `<span class="orb ${extra} ${p.id === "saturn" ? "has-ring" : ""}" style="--c1:${p.c1};--c2:${p.c2}"></span>`;
const orbitText = (days) =>
  days == null ? "N/A" : days >= 365 ? `${(days / 365.25).toFixed(1)} years` : `${fmt(days, 0)} days`;
const setText = (id, v) => ($(id).textContent = v);

function renderStrip() {
  $("planets-grid").innerHTML = PLANETS.map(
    (p) => `
    <button class="planet-card" data-planet-id="${p.id}" style="--c1:${p.color}">
      <div class="orb-slot">${orbHTML(p)}</div>
      <h4>${p.name}</h4>
      <p data-au="${p.id}">${p.au.toFixed(2)} AU</p>
    </button>`
  ).join("");
}

async function loadPlanets() {
  $("planet-status").classList.add("hidden");
  try {
    const data = await getJSON(API.planets, 24 * 60 * 60 * 1000);
    (data.bodies || []).forEach((b) => {
      if (b.isPlanet) planetData[b.englishName.toLowerCase()] = b;
    });
    PLANETS.forEach((p) => {
      const d = planetData[p.id];
      const el = document.querySelector(`[data-au="${p.id}"]`);
      if (d && el) el.textContent = `${(d.semimajorAxis / AU).toFixed(2)} AU`;
    });
    renderTable();
  } catch (err) {
    const s = $("planet-status");
    s.innerHTML = `Couldn't load planet data: ${esc(err.message)} <button class="btn-secondary" data-retry="planets" style="margin-left:10px;padding:6px 12px">Try again</button>`;
    s.classList.remove("hidden");
    $("planet-comparison-tbody").innerHTML = `<tr><td colspan="7" class="muted center">No data</td></tr>`;
  }
  selectPlanet(selectedPlanet);
}

function renderTable() {
  const earth = planetData.earth;
  const earthKg = earth && earth.mass ? earth.mass.massValue * 10 ** earth.mass.massExponent : 5.97237e24;

  $("planet-comparison-tbody").innerHTML = PLANETS.map((p) => {
    const d = planetData[p.id];
    if (!d) return "";
    const massE = d.mass ? (d.mass.massValue * 10 ** d.mass.massExponent) / earthKg : null;
    return `
    <tr data-planet-id="${p.id}" class="${p.id === selectedPlanet ? "active" : ""}">
      <td><div class="pname"><span class="dot" style="background:${p.color}"></span>${p.name}</div></td>
      <td>${(d.semimajorAxis / AU).toFixed(2)}</td>
      <td>${fmt(d.meanRadius * 2)}</td>
      <td>${massE == null ? "N/A" : massE.toFixed(3)}</td>
      <td>${orbitText(d.sideralOrbit)}</td>
      <td>${d.moons ? d.moons.length : 0}</td>
      <td><span class="type-badge ${typeClass(p.type)}">${p.type}</span></td>
    </tr>`;
  }).join("");
}

function selectPlanet(id) {
  const p = PLANETS.find((x) => x.id === id);
  if (!p) return;
  selectedPlanet = id;
  const d = planetData[id];


  $("planet-orb").innerHTML = orbHTML(p, "big");
  setText("planet-detail-name", p.name);
  setText("planet-detail-description", p.desc);
  const badge = $("planet-type-badge");
  badge.textContent = p.type;
  badge.className = "type-badge " + typeClass(p.type);

  const v = (fn) => (d ? fn(d) : "N/A");
  const moons = d && d.moons ? d.moons.length : 0;
  const rot = d && d.sideralRotation;

  setText("planet-distance", v((x) => millions(x.semimajorAxis)));
  setText("planet-radius", v((x) => `${fmt(x.meanRadius)} km`));
  setText("planet-mass", v((x) => (x.mass ? sci(x.mass.massValue, x.mass.massExponent, "kg") : "N/A")));
  setText("planet-density", v((x) => `${fmt(x.density, 2)} g/cm³`));
  setText("planet-orbital-period", v((x) => `${fmt(x.sideralOrbit, 2)} days`));
  setText("planet-rotation", v((x) => (rot == null ? "N/A" : `${fmt(Math.abs(rot), 2)} hours${rot < 0 ? " (retrograde)" : ""}`)));
  setText("planet-moons", d ? moons : "N/A");
  setText("planet-gravity", v((x) => `${fmt(x.gravity, 2)} m/s²`));

  setText("planet-discoverer", v((x) => x.discoveredBy || "Known since antiquity"));
  setText("planet-discovery-date", v((x) => x.discoveryDate || "Ancient times"));
  setText("planet-body-type", v((x) => x.bodyType || "Planet"));
  setText("planet-volume", v((x) => (x.vol ? sci(x.vol.volValue, x.vol.volExponent, "km³") : "N/A")));

  const facts = d
    ? [
        d.mass && `Mass: ${sci(d.mass.massValue, d.mass.massExponent, "kg")}`,
        d.gravity != null && `Surface gravity: ${fmt(d.gravity, 2)} m/s²`,
        d.density != null && `Density: ${fmt(d.density, 2)} g/cm³`,
        d.axialTilt != null && `Axial tilt: ${d.axialTilt}°`,
        `Moons: ${moons}`,
      ].filter(Boolean)
    : [];
  $("planet-facts").innerHTML = facts.length
    ? facts.map((f) => `<li><i class="fas fa-check"></i><span>${esc(f)}</span></li>`).join("")
    : `<li><span class="muted">No data</span></li>`;

  setText("planet-perihelion", v((x) => millions(x.perihelion)));
  setText("planet-aphelion", v((x) => millions(x.aphelion)));
  setText("planet-eccentricity", v((x) => fmt(x.eccentricity, 4)));
  setText("planet-inclination", v((x) => `${fmt(x.inclination, 2)}°`));
  setText("planet-axial-tilt", v((x) => (x.axialTilt != null ? `${x.axialTilt}°` : "N/A")));
  setText("planet-temp", v((x) => (x.avgTemp ? `${Math.round(x.avgTemp - 273.15)}°C` : "N/A")));
  setText("planet-escape", v((x) => (x.escape ? `${fmt(x.escape / 1000, 2)} km/s` : "N/A")));

  document.querySelectorAll(".planet-card").forEach((c) => c.classList.toggle("active", c.dataset.planetId === id));
  document.querySelectorAll("#planet-comparison-tbody tr").forEach((r) => r.classList.toggle("active", r.dataset.planetId === id));
}

document.addEventListener("click", (e) => {
  const t = e.target;

  if (t.closest("[data-close-modal]")) return closeLaunchModal();

  const retry = t.closest("[data-retry]");
  if (retry) {
    const w = retry.dataset.retry;
    if (w === "apod") loadAPOD($("apod-date-input").value || undefined);
    if (w === "launches") loadLaunches();
    if (w === "planets") loadPlanets();
    return;
  }

  const fav = t.closest("[data-fav]");
  if (fav) {
    const on = fav.dataset.on !== "1";
    fav.dataset.on = on ? "1" : "0";
    fav.innerHTML = heart(on);
    return;
  }

  const bell = t.closest("[data-bell]");
  if (bell) {
    const on = bell.dataset.on !== "1";
    bell.dataset.on = on ? "1" : "0";
    bell.innerHTML = `<i class="fas fa-bell"${on ? ' style="color:#facc15"' : ""}></i>`;
    return;
  }

  const det = t.closest("[data-details]");
  if (det) {
    const l = launches.find((x) => x.id === det.dataset.details);
    if (l) openLaunchModal(l);
    return;
  }

  const planet = t.closest("[data-planet-id]");
  if (planet) {
    selectPlanet(planet.dataset.planetId);
    $("planet-detail-name").scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

document.addEventListener("keydown", (e) => e.key === "Escape" && closeLaunchModal());

document.querySelectorAll(".nav-link").forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    showSection(a.dataset.section);
  })
);
$("sidebar-toggle").addEventListener("click", () =>
  $("sidebar").classList.contains("open") ? closeSidebar() : openSidebar()
);
$("overlay").addEventListener("click", closeSidebar);

renderStrip();
selectPlanet(selectedPlanet);
initAPOD();
loadLaunches();
loadPlanets();
