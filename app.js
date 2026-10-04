/* ===================== 我的生活工作台 ===================== */
"use strict";

/* ---------- 数据层 ---------- */
const STORE_KEY = "wb_workbench_v1";
const APP_VERSION = "1.12.0";
const defaultData = () => ({
  todos: [],        // {id, text, pri, done, due, created}
  schedule: [],     // {id, title, date, time, remind, notified}
  meals: [],        // {id, date, meal, name, grams, kcal, p, c, f}
  money: [],        // {id, date, type, cat, amount, note}
  study: [],        // {id, date, subject, minutes, note}
  plans: { daily: {}, monthly: {} },
  weights: [],      // {id, date, kg}
  measurements: [], // 身体维度 {id, date, chest, waist, armL, armR, shoulder, hip, thigh, calf, note}
  dishes: [],       // 点菜台菜品库 {id, name, group, note, kcal, p, c, f}
  orders: [],       // 点菜记录 {id, date, items:[{name, qty, kcal, p, c, f}], note}
  countdowns: [],   // 倒数日/纪念日 {id, title, date, type:'countdown'|'anniversary', emoji}
  sops: [],         // SOP 流程 {id, title, cat, steps:[], note}
  shopping: [],     // 购物清单 {id, name, url, platform, status:'want'|'cart'|'bought', price, note}
  habits: [],      // 习惯打卡 {id, name, icon, color, type:'bool'|'num', target, unit, history:{date:1|number}}
  wellness: [],    // 养生知识 {id, date, tag, title, url, note}
  tarotDraws: [],  // 塔罗占卜 {id, date, card, upright, question, interpretation}
  taoDivinations: [], // 道法占卜 {id, date, method, result, question, interpretation}
  poliNews: [],    // 时政新闻收藏 {id, date, title, url}
  stickers: [],    // 游戏化贴纸 {id, name, icon, module, date}
  moduleXp: { tarot: 0, tao: 0, wellness: 0, logic: 0, finance: 0 }, // 模块熟练度 XP
  dailyQuests: { date: "", tarot: false, tao: false, wellness: false, logic: false, finance: false }, // 每日任务完成状态
  /* biliByTrack 字段已移除（视频内嵌/每日推荐不再需要） */
  vault: { salt: "", items: [], bioId: "", bioWrap: "" }, // 隐私保险箱（AES-GCM 加密存储）+ WebAuthn
  trips: [],        // 旅行计划 {id, name, city, startDate, endDate, arriveVia, arriveTime, departVia, departTime, hotelMode, hotels, spots, plan, status, archive}
  travelHabits: [], // 个人旅行习惯 {id, text, from, date}
  moneyBudgets: {}, // 月预算 {"2026-07": 3000}
  fixedExpenses: [],// 固定支出模板 {id, cat, amount, note}
  billTemplates: [], // 手动记账识别模板 {name, header, roles, catMap, mode}
  assets: [],      // 资产/净值 {id, name, type:"现金"|"卡"|"理财"|"负债"|"其他", value, note}
  goals: [],       // 目标/OKR {id, title, period:"年"|"季"|"月", target, progress, note, children:[{id,text,done}]}
  bookmarks: [],   // 收藏/稍后读 {id, title, url, note, tag, created}
  recurringBills: [], // 周期性账单 {id, cat, amount, note, cycle:'month'|'week'|'day'|'year', anchor, lastRun}
  amortItems: [],   // 周期性产品摊销 {id, name, cat, amount, buyDate, dur, unit:'day'|'week'|'month'|'year', note, created, updatedAt}
  aiMemory: [],     // AI 对话记忆 {ts, kind, text}
  tombstones: {},   // 删除墓碑 {id: 删除时间戳}，用于让"删除"也能跨端同步（否则合并取并集会让删掉的记录复活）
  settings: {
    height: "", targetWeight: "", kcalTarget: 2000, pTarget: 120, cTarget: 220, fTarget: 60,
    syncCode: "", autoSync: false, encryptSync: true,
    syncBackend: "textdb", // textdb | supabase
    supabaseUrl: "", supabaseAnon: "",
    aiBase: "", aiKey: "", aiModel: "",
    mapKey: "", mapProvider: "tencent", lastLoc: null,
    seenGuides: {},
    theme: "light", lastBackup: 0,
    themeColor: "#4f6ef7", fontSize: 16, density: "normal",
    themeMode: "fixed", // fixed | auto | contrast
    remindersEnabled: false, waterReminderMin: 0, waterLastTs: 0,
    autoBackup: false,
    vaultAutoLock: 0, // 分钟，0=不自动锁定
    catBudgets: {}, // 分类月预算 {"2026-07": {"餐饮":800}}
    moneyCats: null, // 自定义分类（null=用默认 MONEY_CATS）
    dashOrder: null, // 仪表盘组件顺序（null=默认）
    xhsNotes: [],  // 小红书知识库笔记 {id,title,author,likes,cat,url,tags,date,memo,desc,created,updatedAt}
    xhsCats: [],   // 知识库分类 {id,name}
  },
  updatedAt: 0,
});

let __corruptRaw = null;    // 损坏原始数据暂存 key
let __storageDead = false;  // 本地存储写入是否已失败（配额满等）
let D = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultData();
    const d = JSON.parse(raw);
    const base = defaultData();
    return { ...base, ...d, plans: { ...base.plans, ...(d.plans || {}) }, settings: { ...base.settings, ...(d.settings || {}) } };
  } catch (e) {
    // 解析失败：不静默清空，先暂存原始内容以便恢复
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const key = "wb_corrupt_" + Date.now();
      try { localStorage.setItem(key, raw); } catch (_) {}
      __corruptRaw = key;
    }
    return defaultData();
  }
}
let __saveTimer = null, __saveDirty = false;
function saveFlush() {
  if (!__saveDirty) return;
  __saveDirty = false;
  if (__storageDead) { if (D.settings.autoBackup) D.settings.autoBackup = false; return; }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(D));
  } catch (e) {
    // 配额满等写入失败时降级，避免中断交互
    __storageDead = true;
    if (D.settings.autoBackup) D.settings.autoBackup = false;
    toast("⚠️ 本地存储写入失败（可能已满）。已停止自动备份，请尽快「导出全部数据」备份或清理浏览器存储后重试。");
    return;
  }
  if (D.settings.autoBackup) autoBackupSnapshot();
}
/* 删除墓碑：记录被删记录的 id 与删除时间。合并时据此把已删记录从"并集"里剔除，
   否则 A 端删掉的条目会被 B 端仍持有的旧副本重新带回来（俗称"删除复活"）。 */
const TOMB_KEEP_DAYS = 180;
function tombstone(id) {
  if (!id) return;
  if (!D.tombstones || typeof D.tombstones !== "object") D.tombstones = {};
  D.tombstones[id] = Date.now();
}
function pruneTombstones(t) {
  const cutoff = Date.now() - TOMB_KEEP_DAYS * 86400000;
  Object.keys(t).forEach((k) => { if (!(t[k] > cutoff)) delete t[k]; });
  return t;
}
/* 轻量数据指纹：静默拉取后据此判断云端是否真带来了新内容，避免无谓重渲染与打扰 */
const SYNC_ARR_FIELDS = ["todos", "schedule", "meals", "money", "study", "weights", "measurements", "dishes", "orders", "countdowns", "sops", "shopping", "trips", "travelHabits", "fixedExpenses", "habits", "amortItems", "xhsNotes", "xhsCats", "wellness", "tarotDraws", "taoDivinations", "poliNews", "stickers"];
function dataSig(d) {
  let s = "";
  SYNC_ARR_FIELDS.forEach((f) => {
    const a = Array.isArray(d[f]) ? d[f] : [];
    let mx = 0;
    for (const x of a) { const t = (x && (x.updatedAt || x.created)) || 0; if (t > mx) mx = t; }
    s += a.length + ":" + mx + "|";
  });
  return s;
}
function save(silentSync) {
  D.updatedAt = Date.now();
  __saveDirty = true;
  if (__saveTimer) clearTimeout(__saveTimer);
  __saveTimer = setTimeout(saveFlush, 400); // 防抖写入，避免大数据频繁 stringify 卡顿
  if (!silentSync && D.settings.autoSync && D.settings.syncCode) debouncePush();
}
function showCorruptBanner(key) {
  const b = $("#corrupt-banner");
  if (!b) return;
  b.innerHTML = `<div style="flex:1"><b>⚠️ 本地数据损坏，已恢复为空工作台</b>：检测到存储中的工作台数据无法解析，已为你保留原始内容（开发者工具 localStorage key：<code>${esc(key)}</code>）。建议：①「设置 → 数据备份 → 导入备份」恢复；② 用同步码「从云端拉取」；③ 先导出下方暂存内容再清空。</div>
    <button class="btn" onclick="downloadCorrupt('${esc(key)}')">导出暂存</button>
    <button class="btn danger" onclick="dismissCorrupt('${esc(key)}')">我已备份，清空</button>`;
  b.style.display = "flex";
}
function downloadCorrupt(key) {
  const raw = localStorage.getItem(key) || "";
  downloadFile("workbench-损坏暂存-" + todayStr() + ".json", new Blob([raw], { type: "application/json" }), "application/json");
}
function dismissCorrupt(key) {
  try { localStorage.removeItem(key); } catch (e) {}
  const b = $("#corrupt-banner"); if (b) b.style.display = "none";
  toast("已清空损坏暂存，当前为空工作台");
}
function autoBackupSnapshot() {
  try {
    D.settings.lastBackup = Date.now();
    const key = "wb_backups_v1";
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
    list.push({ ts: Date.now(), data: JSON.parse(JSON.stringify(D)) });
    if (list.length > 7) list = list.slice(-7);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}
}
function renderBackupList() {
  const el = $("#backup-list"); if (!el) return;
  let list = [];
  try { list = JSON.parse(localStorage.getItem("wb_backups_v1") || "[]"); } catch (e) {}
  list = list.slice().reverse();
  if (!list.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text2)">暂无自动备份快照。</div>'; return; }
  el.innerHTML = `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">自动备份快照（点击恢复）：</div>` + list.map((b, i) =>
    `<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--line)">
      <span style="flex:1">${new Date(b.ts).toLocaleString("zh-CN")}</span>
      <button class="btn sm ghost" onclick="restoreBackup(${b.ts})">恢复</button>
    </div>`).join("");
}
function restoreBackup(ts) {
  appConfirm("确定用该快照覆盖当前数据？当前未保存的改动会丢失。", () => {
    let list = [];
    try { list = JSON.parse(localStorage.getItem("wb_backups_v1") || "[]"); } catch (e) {}
    const b = list.find((x) => x.ts === ts);
    if (!b) return toast("快照不存在");
    const base = defaultData();
    D = { ...base, ...b.data, plans: { ...base.plans, ...(b.data.plans || {}) }, settings: { ...base.settings, ...(b.data.settings || {}) } };
    save(); applyTheme(); buildNav(); go(cur); toast("已恢复快照");
  });
}

/* ---------- 工具 ---------- */
const $ = (s) => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const monthStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
// 仅允许 http/https/相对路径/锚点等安全协议的 URL，拦截 javascript:/data:/vbscript: 等 XSS 向量
function safeUrl(url) {
  const u = String(url == null ? "" : url).trim();
  if (!u) return "#";
  const low = u.toLowerCase().replace(/\s+/g, "");
  if (/^(javascript|data|vbscript):/.test(low)) return "#";
  return u;
}
const fmtMoney = (n) => "¥" + Number(n).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r1 = (n) => Math.round(n * 10) / 10;
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/* 视频内嵌功能已移除：各模块保留平台外链跳转（B站/抖音/小红书搜索） */

/* ---------- 游戏化：每日任务 / 熟练度 / 贴纸 ---------- */
function ensureDailyQuests() {
  const t = todayStr();
  if (!D.dailyQuests || D.dailyQuests.date !== t) {
    D.dailyQuests = { date: t, tarot: false, tao: false, wellness: false, logic: false, finance: false };
  }
  if (!D.moduleXp) D.moduleXp = { tarot: 0, tao: 0, wellness: 0, logic: 0, finance: 0 };
  if (!D.stickers) D.stickers = [];
}
function addXp(module, n) {
  ensureDailyQuests();
  D.moduleXp[module] = (D.moduleXp[module] || 0) + n;
}
function completeQuest(module, stickerName, stickerIcon) {
  ensureDailyQuests();
  if (!D.dailyQuests[module]) {
    D.dailyQuests[module] = true;
    addXp(module, 10);
    const sid = `${module}-${todayStr()}`;
    if (stickerName && !D.stickers.some((s) => s.id === sid)) {
      D.stickers.push({ id: sid, name: stickerName, icon: stickerIcon || "⭐", module, date: todayStr() });
      toast(`获得贴纸 ${stickerIcon || "⭐"} ${stickerName}`);
    } else {
      toast("今日任务完成 +10 XP");
    }
    save();
  }
}
function questProgressHtml(module) {
  ensureDailyQuests();
  const done = !!D.dailyQuests[module];
  return `<div class="quest-progress ${done ? "done" : ""}"><span class="qp-check">${done ? "✅" : "⭕"}</span><span>今日任务 (${done ? "1/1" : "0/1"})</span></div>`;
}
function xpLevel(xp) {
  let x = xp || 0, lv = 1, acc = 0;
  while (acc + lv * 10 <= x) { acc += lv * 10; lv++; }
  return lv;
}
function levelProgress(xp) {
  let x = xp || 0, lv = 1, acc = 0;
  while (acc + lv * 10 <= x) { acc += lv * 10; lv++; }
  const cur = x - acc, need = lv * 10;
  return Math.min(100, Math.round((cur / need) * 100));
}

/* ===== 新增模块常量 ===== */
const DISH_GROUPS = ["凉菜", "热菜", "家常菜", "主食面点", "汤羹", "烧烤", "海鲜河鲜", "饮品", "甜点", "早餐"];
const SHOP_PLATFORMS = ["淘宝/天猫", "京东", "拼多多", "抖音", "小红书", "其他"];
let dishFilter = "all";
function detectPlatform(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("taobao") || u.includes("tmall")) return "淘宝/天猫";
  if (u.includes("jd.com") || u.includes("jd.hk")) return "京东";
  if (u.includes("pinduoduo") || u.includes("yangkeduo") || u.includes("pdd")) return "拼多多";
  if (u.includes("douyin") || u.includes("iesdouyin") || u.includes("byted")) return "抖音";
  if (u.includes("xiaohongshu") || u.includes("xhslink")) return "小红书";
  return "其他";
}
function jsStr(s) { return JSON.stringify(s == null ? "" : s).replace(/"/g, "&quot;"); }

/* ===== 公共 AI 调用（所有模块复用） ===== */
function aiReady() { const s = D.settings; return !!(s.aiBase && s.aiKey && s.aiModel); }
async function aiChat(messages, opts = {}) {
  const s = D.settings;
  if (!aiReady()) throw new Error("NO_AI");
  if (typeof messages === "string") messages = [{ role: "user", content: messages }];
  const base = s.aiBase.replace(/\/+$/, "");
  const url = base.endsWith("/v1") ? base + "/chat/completions" : base + "/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.aiKey },
    body: JSON.stringify({ model: s.aiModel, messages, temperature: opts.temperature ?? 0.4 }),
  });
  if (!res.ok) throw new Error("接口返回 " + res.status);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "";
}

/* ===== 端到端加密云同步（Web Crypto AES-GCM） ===== */
const ENC_SALT = "wb_workbench_e2e_v1";
function cryptoReady() { return !!(window.crypto && window.crypto.subtle); }
async function deriveKey(pass) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(ENC_SALT), iterations: 100000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
const _b64enc = (u8) => { let s = ""; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
const _b64dec = (b64) => { const s = atob(b64); const u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return u8; };
async function encPayload(obj, pass) {
  const key = await deriveKey(pass);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return JSON.stringify({ v: 2, enc: "aes-gcm", iv: _b64enc(iv), data: _b64enc(new Uint8Array(ct)) });
}
async function decPayload(text, pass) {
  const env = JSON.parse(text);
  if (!env.enc) return env; // 兼容未加密的旧数据
  const key = await deriveKey(pass);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: _b64dec(env.iv) }, key, _b64dec(env.data));
  return JSON.parse(new TextDecoder().decode(pt));
}

/* ===== 主题（浅色/深色/自动/高对比） ===== */
function resolveTheme() {
  const m = D.settings.themeMode || "fixed";
  if (m === "contrast") return D.settings.theme === "dark" ? "dark" : "light";
  if (m === "auto") {
    try { if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark"; } catch (e) {}
    const h = new Date().getHours(); return (h >= 19 || h < 7) ? "dark" : "light";
  }
  return D.settings.theme === "dark" ? "dark" : "light";
}
function applyTheme() {
  const root = document.documentElement;
  const th = resolveTheme();
  root.setAttribute("data-theme", th);
  const contrast = D.settings.themeMode === "contrast";
  root.classList.toggle("contrast", contrast);
  document.body.classList.toggle("contrast", contrast);
  const accent = contrast ? "#ffeb3b" : (D.settings.themeColor || "#4f6ef7");
  root.style.setProperty("--primary", accent);
  document.querySelectorAll(".mark, .logo .mark").forEach((el) => { el.style.background = accent; });
  root.style.fontSize = (D.settings.fontSize || 16) + "px";
  const b = $("#theme-btn"); if (b) b.textContent = th === "dark" ? "☀️" : "🌙";
  document.body.classList.toggle("compact", D.settings.density === "compact");
}
function toggleTheme() {
  D.settings.theme = D.settings.theme === "dark" ? "light" : "dark";
  save(true); applyTheme();
}
function setThemeMode(mode, base) {
  D.settings.themeMode = mode;
  if (base) D.settings.theme = base;
  save(true); applyTheme(); renderSettings();
}
function initThemeMode() {
  try { if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if ((D.settings.themeMode || "fixed") === "auto") applyTheme(); }); } catch (e) {}
}

/* ===== 备份提醒 ===== */
function dataCount() { return D.todos.length + D.money.length + D.meals.length + D.study.length + D.weights.length + (D.trips || []).length; }
function checkBackupReminder() {
  const box = $("#backup-banner"); if (!box) return;
  const days = D.settings.lastBackup ? Math.floor((Date.now() - D.settings.lastBackup) / 86400000) : 999;
  if (dataCount() >= 10 && days >= 7) {
    box.style.display = "flex";
    box.innerHTML = `<span>💾 ${D.settings.lastBackup ? `已 ${days} 天未备份数据` : "你还没备份过数据"}，浏览器清缓存会导致数据丢失</span>
      <button class="btn sm" onclick="exportData()">⬇ 立即备份</button>
      <button class="icon-btn" onclick="$('#backup-banner').style.display='none'" title="本次关闭">✕</button>`;
  } else box.style.display = "none";
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}
function openModal(html) {
  $("#modal-root").innerHTML = `<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`;
}
function closeModal() { $("#modal-root").innerHTML = ""; }
function appConfirm(message, onYes, opts = {}) {
  const yesText = opts.yesText || "确定";
  const danger = opts.danger ? "danger" : "";
  openModal(`<h3>请确认</h3>
    <div style="font-size:14px;line-height:1.8;margin:12px 0 20px;color:var(--text)">${esc(message)}</div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn ghost" onclick="closeModal()">取消</button>
      <button class="btn ${danger}" id="ac-yes">${yesText}</button>
    </div>`);
  const yes = document.getElementById("ac-yes");
  if (yes) yes.onclick = () => { closeModal(); try { onYes(); } catch (e) { console.error(e); } };
}

function appPrompt(message, onOk, defaultValue = '') {
  openModal(`<h3>请输入</h3>
    <div style="font-size:14px;line-height:1.8;margin:12px 0 12px;color:var(--text)">${esc(message)}</div>
    <input id="ap-input" value="${esc(defaultValue)}" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);margin-bottom:16px" placeholder="输入三个正整数，例如：3 6 9">
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn ghost" onclick="closeModal()">取消</button>
      <button class="btn" id="ap-ok">确定</button>
    </div>`);
  const input = document.getElementById('ap-input');
  const ok = document.getElementById('ap-ok');
  if (input) { input.focus(); input.select(); input.onkeydown = (e) => { if (e.key === 'Enter' && ok) ok.click(); }; }
  if (ok) ok.onclick = () => { const v = input ? input.value : ''; closeModal(); try { onOk(v); } catch (e) { console.error(e); } };
}

/* ===== 版本更新检测（在线版） ===== */
function checkUpdate() {
  if (location.protocol.indexOf("http") !== 0) return; // 离线单文件不检测
  const seen = +(localStorage.getItem("wb_seen_build") || 0);
  fetch("version.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json()).then((j) => {
    if (j.builtAt && j.builtAt > seen) {
      const b = $("#update-banner");
      if (b) b.style.display = "flex";
    }
  }).catch(() => {});
}
window.applyUpdate = function () {
  localStorage.setItem("wb_seen_build", Date.now());
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
    navigator.serviceWorker.getRegistration().then((r) => { if (r) r.update(); });
  }
  location.reload();
};

/* ---------- 模块元信息（游戏化主题色/图标） ---------- */
const MODULE_META = {
  tarot: { icon: "🔮", name: "塔罗星盘", theme: "purple" },
  tao: { icon: "☯️", name: "道法学习", theme: "dark" },
  wellness: { icon: "🍵", name: "养生知识", theme: "green" },
  logic: { icon: "🧩", name: "逻辑思维", theme: "primary" },
  finance: { icon: "📈", name: "金融理财", theme: "orange" }
};
function moduleHeaderHtml(module, title, subtitle) {
  ensureDailyQuests();
  const meta = MODULE_META[module] || { icon: "🌟", theme: "primary" };
  const xp = (D.moduleXp && D.moduleXp[module]) || 0;
  const lv = xpLevel(xp);
  const pct = levelProgress(xp);
  const done = !!D.dailyQuests[module];
  const stickerCount = D.stickers ? D.stickers.filter((s) => s.module === module).length : 0;
  return `<div class="module-hero theme-${meta.theme}">
    <div class="mh-top">
      <div class="mh-icon">${meta.icon}</div>
      <div class="mh-title-wrap">
        <div class="mh-title">${esc(title)}</div>
        <div class="mh-subtitle">${esc(subtitle)}</div>
      </div>
      <div class="mh-badge"><span>起步</span><span class="dot">·</span><span>${stickerCount}</span></div>
    </div>
    <div class="mh-progress-wrap">
      <div class="mh-progress-bar" style="width:${pct}%"></div>
      <div class="mh-progress-text">熟练度 <b>${pct}%</b></div>
    </div>
    <div class="mh-body">
      <div class="mh-stat"><div class="ms-num">${done ? '1/1' : '0/1'}</div><div class="ms-label">今日任务</div></div>
      <div class="mh-stat"><div class="ms-num">${done ? '100%' : '0%'}</div><div class="ms-label">完成率</div></div>
      <div class="mh-stat"><div class="ms-num">${stickerCount}</div><div class="ms-label">获得贴纸</div></div>
    </div>
  </div>`;
}

/* ---------- 导航 ---------- */
const PAGES = [
  { id: "dashboard", name: "总览", ico: "🏠" },
  { id: "todo", name: "待办清单", ico: "✅" },
  { id: "schedule", name: "日程提醒", ico: "⏰" },
  { id: "calendar", name: "月历视图", ico: "📅" },
  { id: "diet", name: "饮食记录", ico: "🥗" },
  { id: "weight", name: "身体变化", ico: "⚖️" },
  { id: "fitness", name: "健身系统", ico: "💪" },
  { id: "kitchen", name: "美食台", ico: "🍳" },
  { id: "money", name: "记账", ico: "💰" },
  { id: "assets", name: "资产/净值", ico: "📈" },
  { id: "travel", name: "旅行计划", ico: "✈️" },
  { id: "xhs", name: "小红书库", ico: "📕" },
  { id: "hot", name: "当日热点", ico: "🔥" },
  { id: "wellness", name: "养生知识", ico: "🍵" },
  { id: "tarot", name: "塔罗星盘", ico: "🔮" },
  { id: "tao", name: "道法学习", ico: "☯️" },
  { id: "study", name: "学习打卡", ico: "📚" },
  { id: "plan", name: "每日/月计划", ico: "📝" },
  { id: "review", name: "AI 复盘", ico: "🧠" },
  { id: "stats", name: "年度统计", ico: "📊" },
  { id: "sop", name: "SOP库", ico: "📋" },
  { id: "shopping", name: "购物清单", ico: "🛒" },
  { id: "habits", name: "习惯打卡", ico: "🔥" },
  { id: "files", name: "文件归档", ico: "📂" },
  { id: "vault", name: "隐私保险箱", ico: "🔐" },
  { id: "tools", name: "小工具", ico: "🛠️" },
  { id: "goals", name: "目标/OKR", ico: "🎯" },
  { id: "bookmarks", name: "收藏/稍后读", ico: "🔖" },
  { id: "settings", name: "设置/同步", ico: "⚙️" },
];
let cur = "dashboard";
function buildNav() {
  $("#nav").innerHTML = PAGES.map((p) => `<button class="nav-item ${p.id === cur ? "active" : ""}" onclick="go('${p.id}')"><span class="ico">${p.ico}</span>${p.name}</button>`).join("");
  $("#bnav").innerHTML = PAGES.map((p) => `<button class="bnav-item ${p.id === cur ? "active" : ""}" onclick="go('${p.id}')"><span class="ico">${p.ico}</span>${p.name.slice(0, 4)}</button>`).join("");
}
function go(id) {
  cur = id;
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  $("#sec-" + id).classList.add("active");
  const p = PAGES.find((x) => x.id === id);
  $("#page-title").textContent = p.name;
  buildNav();
  RENDER[id] && RENDER[id]();
  maybeAutoGuide(id);
  window.scrollTo(0, 0);
}

/* ===== 全局快速记录（悬浮 +） ===== */
let quickTab = "money";
function openQuickAdd(tab) {
  quickTab = tab || "money";
  const activeTrips = (D.trips || []).filter((t) => t.status !== "archived");
  openModal(`<h3>⚡ 快速记录</h3>
  <div style="display:flex;gap:8px;margin-bottom:12px">
    <button class="btn sm ${quickTab === "money" ? "" : "gray"}" onclick="openQuickAdd('money')">💰 记一笔</button>
    <button class="btn sm ${quickTab === "todo" ? "" : "gray"}" onclick="openQuickAdd('todo')">✅ 加待办</button>
    <button class="btn sm ${quickTab === "study" ? "" : "gray"}" onclick="openQuickAdd('study')">📚 打卡</button>
  </div>
  ${quickTab === "money" ? `
    <div class="form-row">
      <select id="qa-type" onchange="$('#qa-cat').innerHTML=MONEY_CATS[this.value].map(c=>'<option>'+c+'</option>').join('')">${Object.keys(MONEY_CATS).map((k) => `<option>${k}</option>`).join("")}</select>
      <select id="qa-cat">${MONEY_CATS["支出"].map((c) => `<option>${c}</option>`).join("")}</select>
      <input id="qa-amount" type="number" placeholder="金额" min="0" step="0.01" autofocus>
    </div>
    <div class="form-row">
      <input id="qa-note" placeholder="备注(可选)" onkeydown="if(event.key==='Enter')quickSaveMoney()"> ${voiceBtn("qa-note")}
      ${activeTrips.length ? `<select id="qa-trip" style="flex:0 1 150px"><option value="">不关联旅行</option>${activeTrips.map((t) => `<option value="${t.id}">✈️${esc(t.name)}</option>`).join("")}</select>` : ""}
    </div>
    <button class="btn" onclick="quickSaveMoney()">保存</button>`
  : quickTab === "todo" ? `
    <div class="form-row">
      <input id="qa-text" placeholder="要做什么？" autofocus onkeydown="if(event.key==='Enter')quickSaveTodo()"> ${voiceBtn("qa-text")}
      <select id="qa-pri" style="flex:0 1 90px"><option>高</option><option selected>中</option><option>低</option></select>
    </div>
    <div class="form-row"><input id="qa-due" type="date" title="截止日期(可选)"></div>
    <button class="btn" onclick="quickSaveTodo()">保存</button>`
  : `
    <div class="form-row">
      <input id="qa-subject" placeholder="学了什么？" autofocus>
      <input id="qa-min" type="number" placeholder="分钟" min="1" style="flex:0 1 100px" onkeydown="if(event.key==='Enter')quickSaveStudy()">
    </div>
    <button class="btn" onclick="quickSaveStudy()">✓ 打卡</button>`}`);
}
function quickSaveMoney() {
  const amount = parseFloat($("#qa-amount").value);
  if (!amount || amount <= 0) return toast("请输入金额");
  const rec = { id: uid(), date: todayStr(), type: $("#qa-type").value, cat: $("#qa-cat").value, amount, note: $("#qa-note").value.trim() };
  const ts = $("#qa-trip"); if (ts && ts.value) { rec.tripId = ts.value; rec.inTotal = true; }
  D.money.push(rec); save(); closeModal(); RENDER[cur] && RENDER[cur](); toast("已记账 " + fmtMoney(amount));
}
function quickSaveTodo() {
  const text = $("#qa-text").value.trim();
  if (!text) return toast("请输入待办内容");
  D.todos.unshift({ id: uid(), text, pri: $("#qa-pri").value, due: $("#qa-due").value, done: false, created: Date.now() });
  save(); closeModal(); RENDER[cur] && RENDER[cur](); toast("已添加待办");
}
function quickSaveStudy() {
  const subject = $("#qa-subject").value.trim();
  const minutes = parseInt($("#qa-min").value);
  if (!subject) return toast("请输入学习内容");
  if (!minutes || minutes <= 0) return toast("请输入分钟数");
  D.study.push({ id: uid(), date: todayStr(), subject, minutes, note: "" });
  save(); closeModal(); RENDER[cur] && RENDER[cur](); toast("打卡成功 💪");
}

/* ===== 全局搜索 ===== */
function openSearch() {
  openModal(`<h3>🔍 全局搜索</h3>
    <input id="gs-input" placeholder="搜待办 / 账单 / 日程 / 旅行 / SOP / 购物 / 学习记录…" oninput="doSearch()" autofocus>
    <div id="gs-results" style="max-height:50vh;overflow-y:auto;margin-top:10px"><div class="empty">输入关键词开始搜索</div></div>`);
  setTimeout(() => { const i = $("#gs-input"); if (i) i.focus(); }, 50);
}
function doSearch() {
  const q = ($("#gs-input").value || "").trim().toLowerCase();
  const box = $("#gs-results");
  if (!q) { box.innerHTML = '<div class="empty">输入关键词开始搜索</div>'; return; }
  const hit = (s) => (s || "").toLowerCase().includes(q);
  const R = [];
  D.todos.forEach((x) => { if (hit(x.text)) R.push({ ico: "✅", page: "todo", title: x.text, sub: (x.done ? "已完成" : "未完成") + (x.due ? " · " + x.due : "") }); });
  D.money.forEach((x) => { if (hit(x.note) || hit(x.cat)) R.push({ ico: "💰", page: "money", title: (x.note || x.cat) + " " + fmtMoney(x.amount), sub: x.date + " · " + x.type }); });
  (D.amortItems || []).forEach((x) => { if (hit(x.name) || hit(x.cat) || hit(x.note)) R.push({ ico: "🧾", page: "money", title: x.name + " " + fmtMoney(amortDaily(x)) + "/天", sub: "周期性产品 · 总价 " + fmtMoney(x.amount) }); });
  D.schedule.forEach((x) => { if (hit(x.title)) R.push({ ico: "⏰", page: "schedule", title: x.title, sub: x.date + " " + (x.time || "") }); });
  (D.trips || []).forEach((t) => {
    if (hit(t.name) || hit(t.city)) R.push({ ico: "✈️", page: "travel", title: t.name, sub: t.city + " · " + t.startDate, tripId: t.id });
    (t.spots || []).forEach((s) => { if (hit(s.name)) R.push({ ico: "🏞️", page: "travel", title: s.name, sub: "旅行「" + t.name + "」的景点", tripId: t.id }); });
  });
  D.sops.forEach((x) => { if (hit(x.title) || (x.steps || []).some(hit)) R.push({ ico: "📋", page: "sop", title: x.title, sub: "SOP · " + (x.cat || "") }); });
  D.shopping.forEach((x) => { if (hit(x.name)) R.push({ ico: "🛒", page: "shopping", title: x.name, sub: x.platform + " · " + x.status }); });
  D.study.forEach((x) => { if (hit(x.subject) || hit(x.note)) R.push({ ico: "📚", page: "study", title: x.subject + " " + x.minutes + "min", sub: x.date }); });
  D.dishes.forEach((x) => { if (hit(x.name)) R.push({ ico: "🍳", page: "kitchen", title: x.name, sub: "菜品库 · " + (x.group || "") }); });
  D.meals.forEach((x) => { if (hit(x.name)) R.push({ ico: "🍽", page: "diet", title: x.name + (x.meal ? " · " + x.meal : ""), sub: x.date + " · " + r1(x.kcal) + "kcal" }); });
  D.countdowns.forEach((x) => { if (hit(x.title)) R.push({ ico: "⏳", page: "schedule", title: x.title, sub: (x.type === "anniversary" ? "纪念日" : "倒数日") + " · " + x.date }); });
  D.weights.forEach((x) => { if (hit(String(x.kg))) R.push({ ico: "⚖️", page: "weight", title: x.kg + " kg", sub: x.date + " · 体重记录" }); });
  D.measurements.forEach((x) => { if (hit(x.note)) R.push({ ico: "📐", page: "weight", title: x.note || "维度记录", sub: x.date }); });
  (D.habits || []).forEach((x) => { if (hit(x.name)) R.push({ ico: "🔥", page: "habits", title: x.name, sub: "习惯打卡 · 连续 " + habitStreak(x) + " 天" }); });
  FILES_CACHE.forEach((f) => { if (hit(f.name) || hit(f.tags) || hit(f.note)) R.push({ ico: "📂", page: "files", title: f.name, sub: (FILE_CAT_NAME[f.cat] || "文件") + " · " + fmtSize(f.size) + (f.tags ? " · " + f.tags : "") }); });
  if (typeof vaultUnlocked === "function" && vaultUnlocked()) (D.vault.items || []).forEach((it) => { const d = vaultDecryptItem(it); if (d && (hit(d.title) || hit(d.user) || hit(d.note))) R.push({ ico: "🔐", page: "vault", title: d.title, sub: (d.user ? d.user + " · " : "") + "保险箱" }); });
  Object.entries(D.plans.daily).forEach(([d, v]) => { if (hit(v)) R.push({ ico: "📝", page: "plan", title: d + " 的每日计划", sub: v.slice(0, 40) }); });
  box.innerHTML = R.length ? R.slice(0, 50).map((r) => `<div class="list-item" style="cursor:pointer" onclick="closeModal();${r.tripId ? `curTripId='${r.tripId}';travelView='detail';` : ""}go('${r.page}')">
    <span style="font-size:16px">${r.ico}</span>
    <div class="grow"><div class="title" style="font-size:13px">${esc(r.title)}</div><div class="sub">${esc(r.sub)}</div></div>
    <span style="color:var(--text2)">›</span></div>`).join("") + (R.length > 50 ? `<div class="empty">还有 ${R.length - 50} 条结果，请细化关键词</div>` : "")
    : '<div class="empty">没有找到「' + esc(q) + '」相关内容</div>';
}

/* ================= 总览 ================= */
function dateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function weekSeries(kind) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const ds = dateStr(d);
    if (kind === "kcal") out.push(D.meals.filter((m) => m.date === ds).reduce((a, m) => a + m.kcal, 0));
    else if (kind === "spend") out.push(D.money.filter((m) => m.date === ds && m.type === "支出").reduce((a, m) => a + m.amount, 0));
  }
  return out;
}
function sparkline(arr, color) {
  const w = 130, h = 38, max = Math.max(1, ...arr), min = Math.min(0, ...arr), span = (max - min) || 1;
  const y = (v) => h - ((v - min) / span) * (h - 8) - 4;
  const pts = arr.map((v, i) => `${(i / (arr.length - 1) * w).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${w}" cy="${y(arr[arr.length - 1]).toFixed(1)}" r="2.6" fill="${color}"/></svg>`;
}
function donut(pct, color, label, val) {
  pct = Math.max(0, Math.min(100, pct));
  const r = 26, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return `<div style="text-align:center;flex:1;min-width:82px">
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="var(--line)" stroke-width="8"/>
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 36 36)"/>
      <text x="36" y="41" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text)">${Math.round(pct)}%</text>
    </svg>
    <div style="font-size:12px;color:var(--text2);margin-top:2px">${label}</div>
    <div style="font-size:11px;color:var(--text2)">${val}</div>
  </div>`;
}
function todayStatusHtml(t, todosOpen, mac, s, streak, lastW) {
  const doneTodos = D.todos.filter((x) => x.done).length;
  const todoRate = D.todos.length ? Math.round(doneTodos / D.todos.length * 100) : 0;
  const studyToday = D.study.filter((x) => x.date === t).reduce((a, x) => a + (+x.minutes || 0), 0);
  const habitsToday = (D.habits || []).filter((h) => h.history[t]).length;
  const habitsTotal = (D.habits || []).length;
  const wl = [...D.weights].sort((a, b) => a.date.localeCompare(b.date));
  const wChange = wl.length >= 2 ? (wl.at(-1).kg - wl[wl.length - 2].kg) : null;
  const m = monthStr();
  const monthExp = D.money.filter((x) => x.date.startsWith(m) && x.type === "支出").reduce((a, x) => a + x.amount, 0);
  const budget = D.moneyBudgets[m] || 0;
  const budgetLeft = budget ? Math.max(0, budget - monthExp) : null;
  const rows = [
    { label: "待办完成率", v: todoRate + "%", pct: todoRate, col: "var(--primary)", sub: `${doneTodos}/${D.todos.length} 已完成` },
    { label: "今日学习", v: studyToday + " 分钟", pct: Math.min(100, studyToday / 30 * 100), col: "var(--teal)", sub: studyToday >= 30 ? "✅ 已达标" : "建议≥30分钟" },
    { label: "热量达标", v: Math.round(mac.kcal) + "/" + s.kcalTarget, pct: s.kcalTarget ? Math.min(100, mac.kcal / s.kcalTarget * 100) : 0, col: "var(--orange)", sub: mac.kcal <= s.kcalTarget ? "在控" : "⚠️ 偏高" },
    { label: "习惯打卡", v: habitsToday + "/" + habitsTotal, pct: habitsTotal ? habitsToday / habitsTotal * 100 : 0, col: "var(--green)", sub: habitsTotal ? (habitsToday === habitsTotal ? "🎉 全勤" : "继续加油") : "未设习惯" },
    { label: "体重变化(上次)", v: wChange == null ? "--" : (wChange > 0 ? "+" : "") + r1(wChange) + "kg", pct: 50, col: wChange == null ? "var(--text2)" : (wChange <= 0 ? "var(--green)" : "var(--red)"), sub: wChange == null ? "记录不足" : (wChange <= 0 ? "↓ 向好" : "↑ 留意") },
    { label: "本月预算剩余", v: budgetLeft == null ? "未设预算" : fmtMoney(budgetLeft), pct: budget ? Math.min(100, budgetLeft / budget * 100) : 0, col: budgetLeft != null && budgetLeft <= 0 ? "var(--red)" : "var(--primary)", sub: budget ? (budgetLeft <= 0 ? "⚠️ 已超支" : "进度可控") : "设置里可设月预算" },
  ];
  return rows.map((r) => `<div style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span>${r.label}</span><b>${r.v} <span style="font-weight:400;font-size:11px;color:var(--text2)">${r.sub}</span></b></div>
    <div class="pbar" style="height:8px"><div style="width:${Math.max(2, Math.min(100, r.pct))}%;background:${r.col};border-radius:6px;height:100%"></div></div>
  </div>`).join("");
}

function renderDashboard() {
  const t = todayStr();
  const todosOpen = D.todos.filter((x) => !x.done);
  const todaySch = D.schedule.filter((x) => x.date === t).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const meals = D.meals.filter((x) => x.date === t);
  const mac = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const spend = D.money.filter((x) => x.date === t && x.type === "支出").reduce((a, b) => a + b.amount, 0);
  const holdDaily = (D.amortItems || []).filter((it) => !amortProgress(it).done).reduce((a, it) => a + amortDaily(it), 0);
  const lastW = [...D.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const streak = calcStreak();
  const plan = D.plans.daily[t] || "";
  const s = D.settings;

  const goalRings = `<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:space-around">
    ${donut(s.kcalTarget ? (mac.kcal / s.kcalTarget) * 100 : 0, "var(--orange)", "热量", Math.round(mac.kcal) + "/" + s.kcalTarget + " kcal")}
    ${donut(s.pTarget ? (mac.p / s.pTarget) * 100 : 0, "var(--red)", "蛋白质", Math.round(mac.p) + "/" + s.pTarget + " g")}
    ${donut(streak > 0 ? 100 : 0, "var(--green)", "学习打卡", streak + " 天连续")}
  </div>`;

  const wkKcal = weekSeries("kcal"), wkSpend = weekSeries("spend");
  const trend = `<div style="display:flex;gap:14px;flex-wrap:wrap">
    <div style="flex:1;min-width:140px"><div style="font-size:12px;color:var(--text2);margin-bottom:4px">本周热量 (kcal)</div>${sparkline(wkKcal, "var(--orange)")}<div style="font-size:11px;color:var(--text2)">7日均 ${Math.round(wkKcal.reduce((a, b) => a + b, 0) / 7)}</div></div>
    <div style="flex:1;min-width:140px"><div style="font-size:12px;color:var(--text2);margin-bottom:4px">本周支出 (¥)</div>${sparkline(wkSpend, "var(--red)")}<div style="font-size:11px;color:var(--text2)">7日合计 ${fmtMoney(wkSpend.reduce((a, b) => a + b, 0))}</div></div>
  </div>`;

  const quick = `<div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn sm" onclick="go('diet')">🥗 记饮食</button>
    <button class="btn sm" onclick="go('todo')">✅ 加待办</button>
    <button class="btn sm" onclick="go('money')">💰 记一笔</button>
    <button class="btn sm" onclick="go('study')">📚 学习打卡</button>
    <button class="btn sm" onclick="go('review')">🧠 AI 复盘</button>
    <button class="btn sm" onclick="openMorningBrief()">🌅 晨报</button>
    <button class="btn sm" onclick="openGoalDecompose()">🎯 拆解目标</button>
    <button class="btn sm" onclick="go('travel')">✈️ 新建旅行</button>
    <button class="btn sm" onclick="go('schedule')">⏳ 加倒数日</button>
  </div>`;

  const upcomingTrip = [...(D.trips || [])].filter((x) => x.status !== "archived" && x.startDate >= t).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const tripCard = upcomingTrip
    ? `<div class="list-item"><span style="font-size:20px">✈️</span><div class="grow"><div class="title">${esc(upcomingTrip.name)} · ${esc(upcomingTrip.city)}</div><div class="sub">${upcomingTrip.startDate} 出发 · 还有 ${Math.round((new Date(upcomingTrip.startDate + "T00:00:00") - new Date(t + "T00:00:00")) / 86400000)} 天</div></div><button class="btn sm" onclick="openTrip('${upcomingTrip.id}')">查看 ›</button></div>`
    : '<div class="empty">还没有旅行计划</div>';

  $("#sec-dashboard").innerHTML = `
  <div class="card stat" data-dash="st1" draggable="true"><div class="v" style="color:var(--primary)">${todosOpen.length}</div><div class="l">待办未完成</div></div>
  <div class="card stat" data-dash="st2" draggable="true"><div class="v" style="color:var(--teal)">${Math.round(mac.kcal)} <span style="font-size:12px;font-weight:400">kcal</span></div><div class="l">今日摄入热量</div></div>
  <div class="card stat" data-dash="st3" draggable="true"><div class="v" style="color:var(--red)">${fmtMoney(spend)}</div><div class="l">今日支出${holdDaily ? ` · 另摊持有 ${fmtMoney(holdDaily)}` : ""}</div></div>
  <div class="card stat" data-dash="st4" draggable="true"><div class="v" style="color:var(--green)">${streak} <span style="font-size:12px;font-weight:400">天</span></div><div class="l">学习连续打卡</div></div>

  <div class="card span4" data-dash="status" draggable="true">
    <h3>📊 今日状态一览 <button class="more" onclick="go('plan')">编辑计划 ›</button></h3>
    ${todayStatusHtml(t, todosOpen, mac, s, streak, lastW)}
  </div>

  <div class="card span2" data-dash="quick" draggable="true">${quick}</div>
  <div class="card span2" data-dash="goals" draggable="true"><h3>🎯 今日目标达成</h3>${goalRings}</div>
  <div class="card span2" data-dash="trend" draggable="true"><h3>📈 本周趋势 <button class="more" onclick="go('diet')">详情 ›</button></h3>${trend}</div>
  <div class="card span2" data-dash="trip" draggable="true"><h3>✈️ 即将出发 <button class="more" onclick="go('travel')">全部 ›</button></h3>${tripCard}</div>

  <div class="card span2" data-dash="todo" draggable="true">
    <h3>📌 今日待办 <button class="more" onclick="go('todo')">管理 ›</button></h3>
    ${todosOpen.length ? todosOpen.slice(0, 6).map(todoItemHtml).join("") : '<div class="empty">没有未完成的待办，干得漂亮 🎉</div>'}
  </div>
  <div class="card span2" data-dash="sch" draggable="true">
    <h3>⏰ 今日日程 <button class="more" onclick="go('schedule')">管理 ›</button></h3>
    ${todaySch.length ? todaySch.map((x) => `
      <div class="list-item"><span class="tag blue">${x.time || "全天"}</span>
      <div class="grow"><div class="title">${esc(x.title)}</div></div>
      ${x.remind ? "🔔" : ""}</div>`).join("") : '<div class="empty">今天没有安排日程</div>'}
  </div>
  <div class="card span2" data-dash="nutri" draggable="true">
    <h3>🥗 今日营养 <button class="more" onclick="go('diet')">记一笔 ›</button></h3>
    ${macroBars(mac, s)}
  </div>
  <div class="card span2" data-dash="plan" draggable="true">
    <h3>📝 今日计划 <button class="more" onclick="go('plan')">编辑 ›</button></h3>
    ${plan ? `<div style="white-space:pre-wrap;font-size:13px;line-height:1.8;color:var(--text2)">${esc(plan)}</div>` : '<div class="empty">还没写今日计划</div>'}
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:13px;color:var(--text2)">
      ⚖️ 最新体重：${lastW ? `<b style="color:var(--text)">${lastW.kg} kg</b>（${lastW.date}）` : "未记录"}
    </div>
  </div>
  <div class="card span2" data-dash="cd" draggable="true">
    <h3>⏳ 倒数日 / 纪念日 <button class="more" onclick="go('schedule')">管理 ›</button></h3>
    ${dashboardCountdownHtml()}
  </div>
  ${budgetDashCard()}
  ${xhsDashboardCard()}
  <div class="empty" style="grid-column:1/-1;font-size:12px;color:var(--text2)">💡 提示：按住任意卡片可拖动，自由调整仪表盘顺序（自动保存）。</div>`;
  applyDashOrder();
}
// 仪表盘「最近收藏的小红书」小组件（数据来自 xhs 模块，统一随工作台备份/同步）
function xhsDashboardCard() {
  const recent = (typeof xhsRecentList === "function") ? xhsRecentList(6) : [];
  if (!recent.length) {
    return `<div class="card span2" data-dash="xhs" draggable="true">
      <h3>📕 最近收藏的小红书 <button class="more" onclick="go('xhs')">去收藏 ›</button></h3>
      <div class="empty">还没有收藏，去小红书搬点好笔记吧</div>
    </div>`;
  }
  return `<div class="card span2" data-dash="xhs" draggable="true">
    <h3>📕 最近收藏的小红书 <button class="more" onclick="go('xhs')">全部 ›</button></h3>
    ${recent.map((n) => `<div class="list-item" onclick="go('xhs')" style="cursor:pointer">
      <span class="tag" style="background:var(--line);color:var(--text2)">${esc(xhsCatName(n.cat))}</span>
      <div class="grow"><div class="title">${esc(n.title)}</div><div class="sub">${esc(n.author || "匿名")} · ❤ ${xhsLikeFmt(n)}</div></div>
    </div>`).join("")}
  </div>`;
}
function macroBars(mac, s) {
  const rows = [
    { n: "热量", v: mac.kcal, t: s.kcalTarget, u: "kcal", col: "var(--orange)" },
    { n: "蛋白质", v: mac.p, t: s.pTarget, u: "g", col: "var(--red)" },
    { n: "碳水", v: mac.c, t: s.cTarget, u: "g", col: "var(--primary)" },
    { n: "脂肪", v: mac.f, t: s.fTarget, u: "g", col: "var(--teal)" },
  ];
  return rows.map((r) => {
    const pct = Math.min(100, r.t ? (r.v / r.t) * 100 : 0);
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span>${r.n}</span><span style="color:var(--text2)">${r1(r.v)} / ${r.t} ${r.u}</span>
      </div>
      <div class="pbar"><div style="width:${pct}%;background:${r.col}"></div></div>
    </div>`;
  }).join("");
}

/* ================= 待办 ================= */
let todoFilter = "open";
function todoItemHtml(x) {
  const priTag = { "高": "hi", "中": "mid", "低": "lo" }[x.pri] || "mid";
  return `<div class="list-item ${x.done ? "done" : ""}">
    <button class="checkbox ${x.done ? "on" : ""}" onclick="toggleTodo('${x.id}')">${x.done ? "✓" : ""}</button>
    <div class="grow"><div class="title">${esc(x.text)}${x.repeat ? ' <span class="tag blue">🔁' + x.repeat + "</span>" : ""}</div>${x.due ? `<div class="sub">📅 ${x.due}</div>` : ""}</div>
    <span class="tag ${priTag}">${x.pri}</span>
    <button class="icon-btn" title="排入日程" onclick="todoToSch('${x.id}')">📅</button>
    <button class="icon-btn" onclick="delTodo('${x.id}')">✕</button>
  </div>`;
}
function todoSmartScore(x) {
  const pri = { "高": 3, "中": 2, "低": 1 }[x.pri] || 2;
  let dueScore = 0;
  if (x.due) {
    const days = Math.round((new Date(x.due + "T00:00:00") - new Date(todayStr() + "T00:00:00")) / 86400000);
    if (days < 0) dueScore = 5; else if (days === 0) dueScore = 4; else if (days <= 2) dueScore = 3; else if (days <= 7) dueScore = 1;
  }
  return pri * 2 + dueScore;
}
function suggestBanner() {
  const open = D.todos.filter((x) => !x.done);
  if (!open.length) return "";
  const top = open.slice().sort((a, b) => todoSmartScore(b) - todoSmartScore(a)).slice(0, 3);
  return `<div style="background:var(--primary-soft);border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:13px;color:var(--text)">
    💡 <b>今天建议优先：</b>${top.map((x) => esc(x.text)).join("、")}
    <button class="btn sm ghost" style="margin-left:6px" onclick="todoFilter='smart';renderTodo()">按建议排序</button></div>`;
}
function renderTodo() {
  const list = D.todos.filter((x) => todoFilter === "all" ? true : todoFilter === "open" ? !x.done : todoFilter === "smart" ? !x.done : x.done)
    .sort((a, b) => todoFilter === "smart"
      ? (todoSmartScore(b) - todoSmartScore(a))
      : (a.done - b.done) || ({ "高": 0, "中": 1, "低": 2 }[a.pri] - { "高": 0, "中": 1, "低": 2 }[b.pri]));
  $("#sec-todo").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <div class="form-row">
      <input id="todo-text" placeholder="要做什么？回车快速添加" style="flex:3;min-width:160px" onkeydown="if(event.key==='Enter')addTodo()">
      <select id="todo-pri"><option>高</option><option selected>中</option><option>低</option></select>
      <input id="todo-due" type="date" title="截止日期(可选)">
      <select id="todo-repeat" title="重复规则" style="flex:0 1 100px"><option value="">不重复</option><option value="每天">每天</option><option value="每周">每周</option><option value="每月">每月</option></select>
      <button class="btn" onclick="addTodo()">+ 添加</button>
    </div>
    <div style="display:flex;gap:8px">
      ${["open|未完成", "smart|建议优先", "done|已完成", "all|全部"].map((f) => { const [k, n] = f.split("|"); return `<button class="btn sm ${todoFilter === k ? "" : "gray"}" onclick="todoFilter='${k}';renderTodo()">${n}</button>`; }).join("")}
      <button class="btn sm ghost" onclick="decideTodo()">🎲 抽签决定</button>
      <span style="flex:1"></span>
      <span style="font-size:12px;color:var(--text2);align-self:center">共 ${D.todos.length} 项 · 未完成 ${D.todos.filter((x) => !x.done).length} 项</span>
    </div>
  </div>
  <div class="card">${suggestBanner()}${list.length ? list.map(todoItemHtml).join("") : '<div class="empty">暂无待办</div>'}</div>`;
}
function addTodo() {
  const text = $("#todo-text").value.trim();
  if (!text) return toast("请输入待办内容");
  const repeat = $("#todo-repeat") ? $("#todo-repeat").value : "";
  D.todos.unshift({ id: uid(), text, pri: $("#todo-pri").value, due: $("#todo-due").value, repeat, done: false, created: Date.now() });
  save(); renderTodo(); toast("已添加待办" + (repeat ? "（" + repeat + "重复）" : ""));
}
function nextDue(due, repeat) {
  const d = due ? new Date(due + "T00:00") : new Date();
  if (repeat === "每天") d.setDate(d.getDate() + 1);
  else if (repeat === "每周") d.setDate(d.getDate() + 7);
  else if (repeat === "每月") d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toggleTodo(id) {
  const x = D.todos.find((t) => t.id === id);
  if (!x) return;
  x.done = !x.done;
  if (x.done && x.repeat) {
    D.todos.unshift({ id: uid(), text: x.text, pri: x.pri, due: nextDue(x.due || todayStr(), x.repeat), repeat: x.repeat, done: false, created: Date.now() });
    x.repeat = "";
    toast("🔁 已自动生成下一次「" + x.text + "」");
  }
  save(); RENDER[cur]();
}
function delTodo(id) { tombstone(id); D.todos = D.todos.filter((t) => t.id !== id); save(); RENDER[cur](); }
function todoToSch(id) {
  const x = D.todos.find((t) => t.id === id); if (!x) return;
  openModal(`<h3>📅 把待办排入日程</h3>
    <div style="font-size:14px;margin-bottom:10px">${esc(x.text)}</div>
    <div class="form-row"><input id="ts-date" type="date" value="${x.due || todayStr()}"><input id="ts-time" type="time" value="${x.due ? "09:00" : ""}"></div>
    <div style="display:flex;gap:8px"><button class="btn" onclick="doTodoToSch('${id}')">排入日程</button><button class="btn gray" onclick="closeModal()">取消</button></div>`);
}
function doTodoToSch(id) {
  const x = D.todos.find((t) => t.id === id); if (!x) return;
  const date = $("#ts-date").value, time = $("#ts-time").value;
  if (!date) return toast("请选择日期");
  D.schedule.push({ id: uid(), title: x.text, date, time, remind: true, notified: false });
  save(); closeModal(); renderTodo(); toast("已排入日程 📅");
}

/* ================= 日程提醒 ================= */
function renderSchedule() {
  const t = todayStr();
  const list = [...D.schedule].sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
  const upcoming = list.filter((x) => x.date >= t);
  const past = list.filter((x) => x.date < t).reverse().slice(0, 10);
  const item = (x) => `<div class="list-item">
      <span class="tag ${x.date === t ? "hi" : "blue"}">${x.date === t ? "今天" : x.date.slice(5)}</span>
      <div class="grow"><div class="title">${esc(x.title)}</div><div class="sub">${x.time ? "🕐 " + x.time : "全天"}${x.remind ? " · 🔔已开提醒" : ""}</div></div>
      <button class="icon-btn" onclick="delSch('${x.id}')">✕</button></div>`;
  $("#sec-schedule").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <div class="form-row">
      <input id="sch-title" placeholder="日程内容，如：项目周会" style="flex:2;min-width:150px">
      <input id="sch-date" type="date" value="${t}">
      <input id="sch-time" type="time">
    </div>
    <div class="form-row" style="align-items:center">
      <label style="flex:none;display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text2)">
        <input type="checkbox" id="sch-remind" checked style="width:16px;height:16px"> 到点浏览器通知提醒
      </label>
      <span style="flex:1"></span>
      <button class="btn" onclick="addSch()">+ 添加日程</button>
    </div>
    <div style="font-size:12px;color:var(--text2)">提示：需保持页面打开并允许浏览器通知权限，才能收到提醒。</div>
  </div>
  <div class="card" style="margin-bottom:16px"><h3>📅 即将到来</h3>${upcoming.length ? upcoming.map(item).join("") : '<div class="empty">暂无日程</div>'}</div>
  ${past.length ? `<div class="card"><h3>🗂 已过去</h3>${past.map(item).join("")}</div>` : ""}
  <div class="card" style="margin-top:16px">
    <h3>⏳ 倒数日 / 纪念日 <button class="more" onclick="openCountdownModal()">+ 新增 ›</button></h3>
    ${D.countdowns.length ? [...D.countdowns].sort((a, b) => a.date.localeCompare(b.date)).map(countdownCardHtml).join("") : '<div class="empty">还没有倒数日，添加生日、假期、还款日等</div>'}
  </div>`;
}
function addSch() {
  const title = $("#sch-title").value.trim();
  const date = $("#sch-date").value;
  if (!title || !date) return toast("请填写日程内容和日期");
  D.schedule.push({ id: uid(), title, date, time: $("#sch-time").value, remind: $("#sch-remind").checked, notified: false });
  if ($("#sch-remind").checked && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
  save(); renderSchedule(); toast("已添加日程");
}
function delSch(id) { tombstone(id); D.schedule = D.schedule.filter((x) => x.id !== id); save(); renderSchedule(); }

// 提醒轮询
setInterval(() => {
  const now = new Date();
  const t = todayStr();
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  D.schedule.forEach((x) => {
    if (x.remind && !x.notified && x.date === t && x.time && x.time <= hm) {
      x.notified = true; save(true);
      const msg = `日程提醒：${x.title}（${x.time}）`;
      if ("Notification" in window && Notification.permission === "granted") new Notification("⏰ 生活工作台", { body: msg });
      toast("🔔 " + msg);
    }
  });
}, 20000);

/* ================= 月历 ================= */
let calCursor = new Date();
function renderCalendar() {
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const t = todayStr();
  let cells = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const evs = D.schedule.filter((x) => x.date === ds);
    const dues = D.todos.filter((x) => x.due === ds && !x.done);
    const habitCnt = (D.habits || []).filter((h) => h.history && h.history[ds]).length;
    const mealCnt = D.meals.filter((x) => x.date === ds).length;
    const dim = d.getMonth() !== m;
    cells += `<div class="cal-cell ${dim ? "dim" : ""} ${ds === t ? "today" : ""}" onclick="showDay('${ds}')">
      <div class="d">${d.getDate()}</div>
      ${evs.slice(0, 2).map((e) => `<div class="cal-ev">${e.time ? e.time + " " : ""}${esc(e.title)}</div>`).join("")}
      ${dues.slice(0, 1).map((e) => `<div class="cal-ev todo">📌${esc(e.text)}</div>`).join("")}
      <div class="cal-dots">${[...evs.map(() => "var(--primary)"), ...dues.map(() => "var(--orange)"), ...Array(habitCnt).fill("var(--green)"), ...Array(mealCnt).fill("var(--purple)")].slice(0, 5).map((c) => `<span style="width:5px;height:5px;border-radius:50%;background:${c}"></span>`).join("")}</div>
    </div>`;
  }
  $("#sec-calendar").innerHTML = `
  <div class="card">
    <div class="cal-head">
      <button class="btn sm gray" onclick="calMove(-1)">‹ 上月</button>
      <div class="m">${y} 年 ${m + 1} 月</div>
      <div style="display:flex;gap:6px">
        <button class="btn sm gray" onclick="calCursor=new Date();renderCalendar()">今天</button>
        <button class="btn sm gray" onclick="calMove(1)">下月 ›</button>
      </div>
    </div>
    <div class="cal-grid">${WEEK.map((w) => `<div class="cal-wd">${w}</div>`).join("")}${cells}</div>
    <div style="margin-top:10px;font-size:12px;color:var(--text2)">● 蓝点=日程　● 橙点=截止待办　● 绿点=习惯打卡　● 紫点=饮食记录　点击日期查看详情</div>
  </div>`;
}
function calMove(n) { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + n, 1); renderCalendar(); }
function showDay(ds) {
  const evs = D.schedule.filter((x) => x.date === ds).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const dues = D.todos.filter((x) => x.due === ds);
  const meals = D.meals.filter((x) => x.date === ds);
  const kcal = meals.reduce((a, b) => a + b.kcal, 0);
  const plan = D.plans.daily[ds];
  openModal(`<h3>📅 ${ds}</h3>
    <div style="font-size:14px;line-height:2">
      <b>日程：</b>${evs.length ? "" : '<span style="color:var(--text2)">无</span>'}
      ${evs.map((e) => `<div class="list-item"><span class="tag blue">${e.time || "全天"}</span><div class="grow">${esc(e.title)}</div></div>`).join("")}
      <b>截止待办：</b>${dues.length ? "" : '<span style="color:var(--text2)">无</span>'}
      ${dues.map((e) => `<div class="list-item ${e.done ? "done" : ""}"><div class="grow"><div class="title">${esc(e.text)}</div></div><span class="tag ${e.done ? "lo" : "mid"}">${e.done ? "已完成" : "未完成"}</span></div>`).join("")}
      ${meals.length ? `<b>饮食：</b>共 ${Math.round(kcal)} kcal（${meals.length} 条记录）<br>` : ""}
      ${plan ? `<b>当日计划：</b><div style="white-space:pre-wrap;color:var(--text2);font-size:13px">${esc(plan)}</div>` : ""}
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn ghost" onclick="closeModal();go('schedule');setTimeout(()=>{$('#sch-date').value='${ds}'},50)">+ 加日程</button>
      <button class="btn gray" onclick="closeModal()">关闭</button>
    </div>`);
}

/* ================= 饮食记录 ================= */
let dietDate = todayStr();
const MEAL_TYPES = ["早餐", "午餐", "晚餐", "加餐"];
let pickedFood = null;

function renderDiet() {
  const meals = D.meals.filter((x) => x.date === dietDate);
  const mac = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const s = D.settings;
  const aiReady = s.aiBase && s.aiKey && s.aiModel;
  const groups = MEAL_TYPES.map((mt) => {
    const list = meals.filter((x) => x.meal === mt);
    if (!list.length) return "";
    return `<div class="meal-group-title">${mt} · ${Math.round(list.reduce((a, b) => a + b.kcal, 0))} kcal</div>` +
      list.map((x) => `<div class="list-item">
        <div class="grow"><div class="title">${esc(x.name)} <span style="color:var(--text2);font-size:12px">${x.grams}g</span></div>
        <div class="sub">${Math.round(x.kcal)}kcal · 蛋白${r1(x.p)}g · 碳水${r1(x.c)}g · 脂肪${r1(x.f)}g</div></div>
        <button class="icon-btn" onclick="delMeal('${x.id}')">✕</button></div>`).join("");
  }).join("");

  $("#sec-diet").innerHTML = `
  <div class="grid cols-2">
    <div>
      <div class="card" style="margin-bottom:16px">
        <h3>🍽 添加饮食 <input type="date" value="${dietDate}" style="width:auto;font-size:12px;padding:5px 8px" onchange="dietDate=this.value;renderDiet()"></h3>
        <div class="form-row">
          <select id="meal-type">${MEAL_TYPES.map((m) => `<option>${m}</option>`).join("")}</select>
          <div style="position:relative;flex:2;min-width:140px">
            <input id="food-name" placeholder="输入食材名搜索，如：鸡胸肉" autocomplete="off" oninput="suggestFood()" onfocus="suggestFood()"> ${voiceBtn("food-name")}
            <div id="food-suggest" class="food-suggest" style="display:none"></div>
          </div>
          <input id="food-grams" type="number" placeholder="生重(g)" min="1">
          <button class="btn" onclick="addMealByDb()">+ 添加</button>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:12px">内置 ${FOOD_DB.length} 种常见食材营养库（按生重计算）；没找到？<a href="javascript:manualFood()" style="color:var(--primary)">手动录入营养</a></div>
        <div class="ai-zone" onclick="${aiReady ? "$('#food-photo').click()" : "toast('请先到 设置 中配置 AI 接口');go('settings')"}">
          📷 <b>AI 拍照识别菜品</b>（上传照片 → 自动分析食材生重与三大营养素）<br>
          <span style="font-size:11px">${aiReady ? "已配置 AI 接口，点击上传图片" : "⚠️ 尚未配置 AI 接口，点击前往设置"}</span>
        </div>
        <div style="margin:8px 0 12px"><button class="btn ghost sm" onclick="showSetupGuide('ai')">📖 AI 接口图文配置指引</button></div>
        <input type="file" id="food-photo" accept="image/*" style="display:none" onchange="aiAnalyzeFood(this)">
      </div>
      <div class="card"><h3>📋 ${dietDate === todayStr() ? "今日" : dietDate} 饮食明细</h3>
        ${groups || '<div class="empty">暂无饮食记录，先记一笔吧</div>'}
      </div>
    </div>
    <div>
      <div class="card" style="margin-bottom:16px">
        <h3>🎯 营养目标达成（增肌/减脂）</h3>
        ${macroRingSvg(mac, s)}
        ${macroBars(mac, s)}
        <div style="font-size:12px;color:var(--text2)">目标值可在「设置」中按增肌/减脂需求调整。</div>
      </div>
      <div class="card"><h3>📈 近7天热量趋势</h3>${kcalTrendSvg()}</div>
      <div class="card"><h3>📊 近30天营养趋势（热量 vs 目标）</h3>${dietTrend30Html()}</div>
    </div>
  </div>`;
}
function macroRingSvg(mac, s) {
  const pk = mac.p * 4, ck = mac.c * 4, fk = mac.f * 9;
  const tot = pk + ck + fk;
  if (!tot) return '<div class="empty" style="padding:12px 0">吃点东西才有营养占比图哦</div>';
  const segs = [
    { v: pk, col: "#e11d48", n: "蛋白质" },
    { v: ck, col: "#4f6ef7", n: "碳水" },
    { v: fk, col: "#0d9488", n: "脂肪" },
  ];
  let acc = 0; const R = 42, C = 2 * Math.PI * R;
  const circles = segs.map((sg) => {
    const len = (sg.v / tot) * C;
    const el = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${sg.col}" stroke-width="16" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"/>`;
    acc += len; return el;
  }).join("");
  return `<div class="macro-ring" style="margin-bottom:12px">
    <svg width="120" height="120" viewBox="0 0 120 120">${circles}
      <text x="60" y="56" text-anchor="middle" font-size="18" font-weight="700" fill="#1c2333">${Math.round(mac.kcal)}</text>
      <text x="60" y="74" text-anchor="middle" font-size="10" fill="#6b7280">kcal</text></svg>
    <div style="font-size:13px;line-height:2">
      ${segs.map((sg) => `<div><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${sg.col};margin-right:6px"></span>${sg.n} ${Math.round((sg.v / tot) * 100)}%（供能）</div>`).join("")}
    </div></div>`;
}
function kcalTrendSvg() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    days.push({ ds, label: `${d.getMonth() + 1}/${d.getDate()}`, v: D.meals.filter((x) => x.date === ds).reduce((a, b) => a + b.kcal, 0) });
  }
  const max = Math.max(...days.map((d) => d.v), D.settings.kcalTarget, 1);
  const W = 320, H = 150, bw = 30;
  const bars = days.map((d, i) => {
    const h = (d.v / max) * 100;
    const x = 20 + i * ((W - 30) / 7);
    const over = d.v > D.settings.kcalTarget;
    return `<rect x="${x}" y="${120 - h}" width="${bw}" height="${Math.max(h, 1)}" rx="5" fill="${over ? "#f59e0b" : "#4f6ef7"}"/>
      <text x="${x + bw / 2}" y="${114 - h}" text-anchor="middle" font-size="9" fill="#6b7280">${d.v ? Math.round(d.v) : ""}</text>
      <text x="${x + bw / 2}" y="${H - 12}" text-anchor="middle" font-size="9" fill="#6b7280">${d.label}</text>`;
  }).join("");
  const ty = 120 - (D.settings.kcalTarget / max) * 100;
  return `<div class="chart-wrap"><svg width="100%" viewBox="0 0 ${W} ${H}" style="min-width:300px">
    <line x1="15" y1="${ty}" x2="${W - 5}" y2="${ty}" stroke="#e11d48" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="${W - 6}" y="${ty - 4}" text-anchor="end" font-size="9" fill="#e11d48">目标 ${D.settings.kcalTarget}</text>
    ${bars}</svg></div>`;
}
function suggestFood() {
  const kw = $("#food-name").value.trim();
  const box = $("#food-suggest");
  pickedFood = null;
  if (!kw) { box.style.display = "none"; return; }
  const list = FOOD_DB.filter((f) => f.name.includes(kw)).slice(0, 12);
  if (!list.length) { box.style.display = "none"; return; }
  box.innerHTML = list.map((f, i) => `<div onclick="pickFood('${esc(f.name)}')"><span>${f.name}</span><span class="m">${f.kcal}kcal · P${f.p} C${f.c} F${f.f} /100g</span></div>`).join("");
  box.style.display = "block";
}
function pickFood(name) {
  pickedFood = FOOD_DB.find((f) => f.name === name);
  $("#food-name").value = name;
  $("#food-suggest").style.display = "none";
  $("#food-grams").focus();
}
function addMealByDb() {
  const name = $("#food-name").value.trim();
  const grams = parseFloat($("#food-grams").value);
  const food = pickedFood || FOOD_DB.find((f) => f.name === name);
  if (!name) return toast("请输入食材名");
  if (!grams || grams <= 0) return toast("请输入生重克数");
  if (!food) return manualFood(name, grams);
  const k = grams / 100;
  D.meals.push({ id: uid(), date: dietDate, meal: $("#meal-type").value, name, grams, kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k });
  save(); renderDiet(); toast(`已记录 ${name} ${grams}g`);
}
function manualFood(name = "", grams = "") {
  openModal(`<h3>✍️ 手动录入营养（每100g）</h3>
    <div class="form-row"><div><label class="fl">食材名</label><input id="mf-name" value="${esc(name)}"></div>
    <div><label class="fl">生重(g)</label><input id="mf-grams" type="number" value="${grams}"></div></div>
    <div class="form-row">
      <div><label class="fl">热量kcal/100g</label><input id="mf-kcal" type="number"></div>
      <div><label class="fl">蛋白质g</label><input id="mf-p" type="number"></div></div>
    <div class="form-row">
      <div><label class="fl">碳水g</label><input id="mf-c" type="number"></div>
      <div><label class="fl">脂肪g</label><input id="mf-f" type="number"></div></div>
    <div style="display:flex;gap:8px"><button class="btn" onclick="saveManualFood()">保存</button><button class="btn gray" onclick="closeModal()">取消</button></div>`);
}
function saveManualFood() {
  const name = $("#mf-name").value.trim(), grams = parseFloat($("#mf-grams").value);
  if (!name || !grams) return toast("请填写食材名和克数");
  const k = grams / 100;
  const num = (id) => parseFloat($(id).value) || 0;
  D.meals.push({ id: uid(), date: dietDate, meal: $("#meal-type") ? $("#meal-type").value : "加餐", name, grams, kcal: num("#mf-kcal") * k, p: num("#mf-p") * k, c: num("#mf-c") * k, f: num("#mf-f") * k });
  save(); closeModal(); renderDiet(); toast("已手动记录");
}
function delMeal(id) { tombstone(id); D.meals = D.meals.filter((x) => x.id !== id); save(); renderDiet(); }

/* ---- AI 拍照识别 ---- */
async function aiAnalyzeFood(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = "";
  const s = D.settings;
  toast("🤖 AI 正在识别菜品，请稍候…");
  try {
    const b64 = await compressImage(file, 800);
    const txt = await aiChat([{
      role: "user",
      content: [
        { type: "text", text: '请识别这张餐食照片中的所有菜品/食材。估算每种食材的"生重克数"，并给出对应的热量(kcal)、蛋白质(g)、碳水(g)、脂肪(g)。只返回JSON数组，不要任何其他文字，格式：[{"name":"食材名","grams":生重数字,"kcal":数字,"p":数字,"c":数字,"f":数字}]' },
        { type: "image_url", image_url: { url: b64 } },
      ],
    }], { temperature: 0.2 });
    const m = txt.match(/\[[\s\S]*\]/);
    if (!m) throw new Error("AI 未返回有效结果");
    const foods = JSON.parse(m[0]);
    if (!Array.isArray(foods) || !foods.length) throw new Error("未识别出食材");
    openModal(`<h3>🤖 AI 识别结果（可确认后入账）</h3>
      ${foods.map((f, i) => `<div class="list-item"><div class="grow"><div class="title">${esc(f.name)} ${f.grams}g</div>
        <div class="sub">${Math.round(f.kcal)}kcal · 蛋白${r1(f.p)}g · 碳水${r1(f.c)}g · 脂肪${r1(f.f)}g</div></div></div>`).join("")}
      <div class="form-row" style="margin-top:12px"><select id="ai-meal-type">${MEAL_TYPES.map((m2) => `<option>${m2}</option>`).join("")}</select></div>
      <div style="display:flex;gap:8px"><button class="btn" onclick='confirmAiFoods(${JSON.stringify(foods).replace(/'/g, "&#39;")})'>✓ 全部记录</button>
      <button class="btn gray" onclick="closeModal()">取消</button></div>`);
  } catch (e) {
    toast("识别失败：" + e.message + "（可检查设置中的AI配置）");
  }
}
function confirmAiFoods(foods) {
  const mt = $("#ai-meal-type").value;
  foods.forEach((f) => D.meals.push({ id: uid(), date: dietDate, meal: mt, name: f.name, grams: +f.grams || 0, kcal: +f.kcal || 0, p: +f.p || 0, c: +f.c || 0, f: +f.f || 0 }));
  save(); closeModal(); renderDiet(); toast(`已记录 ${foods.length} 项 AI 识别结果`);
}
function compressImage(file, maxW) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxW / img.width);
      const cv = document.createElement("canvas");
      cv.width = img.width * k; cv.height = img.height * k;
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ================= 记账 ================= */
let MONEY_CATS = (D.settings.moneyCats && Object.keys(D.settings.moneyCats).length) ? D.settings.moneyCats : { 支出: ["餐饮", "交通", "购物", "居住", "娱乐", "医疗", "学习", "健身", "其他"], 收入: ["工资", "兼职", "理财", "红包", "其他"] };
function syncMoneyCats() { D.settings.moneyCats = JSON.parse(JSON.stringify(MONEY_CATS)); save(true); }
let moneyMonth = monthStr();
let moneyView = "cash"; // cash=现金流口径（付款当天全额）｜amort=摊销口径（大额按天摊平）
function moneyCounted(x) { return !(x.tripId && x.inTotal === false); } // 旅行账单可选不计入总账
function renderMoney() {
  const list = D.money.filter((x) => x.date.startsWith(moneyMonth)).sort((a, b) => b.date.localeCompare(a.date));
  const inc = list.filter((x) => x.type === "收入" && moneyCounted(x)).reduce((a, b) => a + b.amount, 0);
  const expCash = list.filter((x) => x.type === "支出" && moneyCounted(x)).reduce((a, b) => a + b.amount, 0);
  const excluded = list.filter((x) => x.type === "支出" && !moneyCounted(x)).reduce((a, b) => a + b.amount, 0);
  const adj = amortAdjust(moneyMonth);
  const useAmort = moneyView === "amort";
  const exp = useAmort ? Math.max(0, expCash - adj.removed + adj.added) : expCash;
  const byCat = {};
  list.filter((x) => x.type === "支出" && moneyCounted(x)).forEach((x) => byCat[x.cat] = (byCat[x.cat] || 0) + x.amount);
  if (useAmort) Object.entries(adj.byCat).forEach(([c, v]) => { byCat[c] = (byCat[c] || 0) + v; if (byCat[c] <= 0.005) delete byCat[c]; });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] || 1;
  const hasAmort = (D.amortItems || []).length > 0;
  const activeTrips = (D.trips || []).filter((t) => t.status !== "archived");
  const tripsWithBills = (D.trips || []).filter((t) => D.money.some((x) => x.tripId === t.id));
  $("#sec-money").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <div class="form-row">
      <select id="mn-type" onchange="fillMoneyCats()">${Object.keys(MONEY_CATS).map((k) => `<option>${k}</option>`).join("")}</select>
      <select id="mn-cat">${MONEY_CATS["支出"].map((c) => `<option>${c}</option>`).join("")}</select>
      <input id="mn-amount" type="number" placeholder="金额" min="0" step="0.01">
      <input id="mn-date" type="date" value="${todayStr()}">
    </div>
    <div class="form-row">
      <input id="mn-note" placeholder="备注(可选)，如：午饭轻食">
      <select id="mn-trip" style="flex:0 1 180px" onchange="$('#mn-intotal-wrap').style.display=this.value?'flex':'none'">
        <option value="">不关联旅行</option>
        ${activeTrips.map((t) => `<option value="${t.id}">✈️ ${esc(t.name)}</option>`).join("")}
      </select>
      <label id="mn-intotal-wrap" style="display:none;align-items:center;gap:5px;font-size:12px;color:var(--text2);flex:none">
        <input type="checkbox" id="mn-intotal" checked style="width:16px;height:16px"> 计入总账
      </label>
      <button class="btn" onclick="addMoney()">+ 记一笔</button>
    </div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    <button class="btn ghost sm" onclick="openBillImport()">📥 导入账单 CSV</button>
    <button class="btn ghost sm" onclick="openAiReceipt()">🤖 AI 识票</button>
    <span style="font-size:12px;color:var(--text2);align-self:center">批量导入银行/支付宝/微信流水，或贴小票让 AI 拆条</span>
  </div>
  ${hasAmort ? `<div class="card" style="margin-bottom:16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px">
    <span style="font-size:13px;font-weight:600">统计口径</span>
    <button class="btn sm ${useAmort ? "ghost" : ""}" onclick="moneyView='cash';renderMoney()">💵 现金流</button>
    <button class="btn sm ${useAmort ? "" : "ghost"}" onclick="moneyView='amort';renderMoney()">🧾 摊销</button>
    <span style="font-size:12px;color:var(--text2);flex:1;min-width:220px">${useAmort
      ? `大额产品已按天摊平：本月扣除一次性实付 ${fmtMoney(adj.removed)}，改计应摊 ${fmtMoney(adj.added)}`
      : "按付款当天全额计。切到「摊销」可把大额产品摊到每一天，看真实持有成本"}</span>
  </div>` : ""}
  <div class="grid cols-3" style="margin-bottom:16px">
    <div class="card stat"><div class="v" style="color:var(--green)">${fmtMoney(inc)}</div><div class="l">${moneyMonth.slice(5)}月收入</div></div>
    <div class="card stat"><div class="v" style="color:var(--red)">${fmtMoney(exp)}</div><div class="l">${moneyMonth.slice(5)}月支出${useAmort ? " · 摊销口径" : ""}${excluded ? `<span style="color:var(--orange)"> · 另有旅行未计入 ${fmtMoney(excluded)}</span>` : ""}</div></div>
    <div class="card stat"><div class="v" style="color:${inc - exp >= 0 ? "var(--primary)" : "var(--red)"}">${fmtMoney(inc - exp)}</div><div class="l">结余</div></div>
  </div>
  ${budgetBarHtml(exp)}
  ${catBudgetStatusHtml()}
  ${budgetExecTrendHtml()}
  ${amortCardHtml()}
  <div class="grid cols-2" style="margin-bottom:16px">
    <div class="card"><h3>📈 年度支出趋势（${moneyMonth.slice(0, 4)}年 · ${useAmort ? "摊销口径" : "计入总账口径"}）</h3>${yearTrendSvg(moneyMonth.slice(0, 4), useAmort)}</div>
    <div class="card"><h3>📌 固定支出模板 <button class="more" onclick="openFixedTplModal()">+ 添加模板 ›</button></h3>
      ${D.fixedExpenses.length ? D.fixedExpenses.map((f) => {
        const applied = list.some((x) => x.fixedId === f.id);
        return `<div class="list-item">
        <span class="tag hi">${f.cat}</span>
        <div class="grow"><div class="title">${esc(f.note) || f.cat}</div><div class="sub">${fmtMoney(f.amount)} / 月</div></div>
        ${applied ? '<span class="tag lo">本月已记</span>' : `<button class="btn sm ghost" onclick="applyFixedTpl('${f.id}')">记入${moneyMonth.slice(5)}月</button>`}
        <button class="icon-btn" onclick="delFixedTpl('${f.id}')">✕</button></div>`;
      }).join("") + (D.fixedExpenses.some((f) => !list.some((x) => x.fixedId === f.id)) ? `<button class="btn sm" style="margin-top:8px" onclick="applyAllFixedTpl()">⚡ 未记模板一键全部记入</button>` : "")
      : '<div class="empty">把房租、话费等每月固定支出存为模板，每月一键记入</div>'}
    </div>
  </div>
  ${tripsWithBills.length ? `<div class="card" style="margin-bottom:16px">
    <h3>✈️ 旅行板块 <span class="more">按旅行汇总 · 点击查看明细</span></h3>
    ${tripsWithBills.map((t) => {
      const bills = D.money.filter((x) => x.tripId === t.id && x.type === "支出");
      const total = bills.reduce((a, b) => a + b.amount, 0);
      const inT = bills.filter(moneyCounted).reduce((a, b) => a + b.amount, 0);
      return `<div class="list-item" style="cursor:pointer" onclick="curTripId='${t.id}';travelView='detail';go('travel')">
        <span style="font-size:18px">${t.status === "archived" ? "📦" : "🧳"}</span>
        <div class="grow"><div class="title">${esc(t.name)}</div><div class="sub">${t.startDate} ~ ${t.endDate} · ${bills.length} 笔</div></div>
        <div style="text-align:right"><b style="color:var(--red)">${fmtMoney(total)}</b>
        <div style="font-size:11px;color:var(--text2)">计入总账 ${fmtMoney(inT)}${total - inT > 0.001 ? " · 未计入 " + fmtMoney(total - inT) : ""}</div></div>
        <span style="color:var(--text2)">›</span></div>`;
    }).join("")}
  </div>` : ""}
  <div class="grid cols-2">
    <div class="card">
      <h3>📒 账单明细 <input type="month" value="${moneyMonth}" style="width:auto;font-size:12px;padding:5px 8px" onchange="moneyMonth=this.value;renderMoney()"> <button class="more" onclick="exportMonthPdf()">📄 报表</button></h3>
      ${list.length ? list.map((x) => {
        const trip = x.tripId ? (D.trips || []).find((t) => t.id === x.tripId) : null;
        const am = x.amortId ? (D.amortItems || []).find((i) => i.id === x.amortId) : null;
        const struck = useAmort && am; // 摊销口径下这笔一次性大额不按全额计
        return `<div class="list-item">
        <span class="tag ${x.type === "支出" ? "hi" : "lo"}">${x.cat}</span>
        <div class="grow"><div class="title">${esc(x.note) || x.cat}${trip ? ` <span class="tag purple">✈️${esc(trip.name)}</span>` : ""}${x.tripId && x.inTotal === false ? ' <span class="tag orange">不计总账</span>' : ""}${am ? ' <span class="tag purple">🧾已摊销</span>' : ""}</div>
        <div class="sub">${x.date}${struck ? ` · 本月按 ${fmtMoney(amortInMonth(am, moneyMonth))} 计入` : ""}${am ? ` · <span style="color:var(--primary);cursor:pointer" onclick="unlinkAmort('${x.id}')">取消关联</span>` : ""}</div></div>
        <b style="color:${struck ? "var(--text2)" : x.type === "支出" ? "var(--red)" : "var(--green)"};${struck ? "text-decoration:line-through" : ""}">${x.type === "支出" ? "-" : "+"}${fmtMoney(x.amount)}</b>
        <button class="icon-btn" onclick="delMoney('${x.id}')">✕</button></div>`;
      }).join("") : '<div class="empty">本月还没有账单</div>'}
    </div>
    <div class="card">      <h3>📊 支出分类占比 <span class="more">仅统计计入总账部分</span></h3>
      ${cats.length ? moneyPieSvg(cats, exp) : ""}
      ${cats.length ? cats.map(([c, v]) => {
        const b = (D.settings.catBudgets && D.settings.catBudgets[moneyMonth] && D.settings.catBudgets[moneyMonth][c]) || 0;
        const over = b && v > b;
        return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${c}${b ? ` · 预算 ${fmtMoney(b)}` : ""}</span><span style="color:${over ? "var(--red)" : "var(--text2)"}">${fmtMoney(v)} · ${Math.round(v / exp * 100)}%</span></div>
        <div class="pbar"><div style="width:${(v / maxCat) * 100}%;background:${over ? "var(--red)" : "var(--purple)"}"></div></div></div>`;
      }).join("") : '<div class="empty">暂无支出数据</div>'}
    </div>
  </div>`;
}
function fillMoneyCats() {
  $("#mn-cat").innerHTML = MONEY_CATS[$("#mn-type").value].map((c) => `<option>${c}</option>`).join("");
}
/* ---- 月度预算 ---- */
function budgetBarHtml(exp) {
  const b = D.moneyBudgets[moneyMonth];
  if (!b) return `<div class="card" style="margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <span style="font-size:13px;color:var(--text2)">🎯 本月还没设预算，超支无感很危险</span>
    <input id="bg-amount" type="number" placeholder="预算金额" min="0" style="flex:0 1 140px">
    <button class="btn sm" onclick="setBudget()">设置${moneyMonth.slice(5)}月预算</button></div>`;
  const pct = Math.min(100, Math.round(exp / b * 100));
  const over = exp > b;
  const dayLeft = (() => { const [y, m] = moneyMonth.split("-").map(Number); const last = new Date(y, m, 0).getDate(); const now = new Date(); return (monthStr() === moneyMonth) ? last - now.getDate() + 1 : 0; })();
  return `<div class="card" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;flex-wrap:wrap;gap:6px">
      <span>🎯 ${moneyMonth.slice(5)}月预算 <b>${fmtMoney(b)}</b> · 已用 <b style="color:${over ? "var(--red)" : "var(--text)"}">${fmtMoney(exp)}</b>（${pct}%）</span>
      <span style="color:${over ? "var(--red)" : "var(--green)"}">${over ? "⚠️ 已超支 " + fmtMoney(exp - b) : "剩余 " + fmtMoney(b - exp) + (dayLeft ? " · 日均可花 " + fmtMoney((b - exp) / dayLeft) : "")}</span>
    </div>
    <div class="pbar" style="height:10px"><div style="width:${pct}%;background:${over ? "var(--red)" : pct > 80 ? "var(--orange)" : "var(--green)"}"></div></div>
    <div style="margin-top:6px"><button class="more" style="background:none;border:none;color:var(--primary);font-size:12px;cursor:pointer" onclick="D.moneyBudgets['${moneyMonth}']=0;delete D.moneyBudgets['${moneyMonth}'];save();renderMoney()">重设预算</button></div>
  </div>`;
}
function setBudget() {
  const v = parseFloat($("#bg-amount").value);
  if (!v || v <= 0) return toast("请输入预算金额");
  D.moneyBudgets[moneyMonth] = v; save(); renderMoney(); toast("已设置" + moneyMonth.slice(5) + "月预算 " + fmtMoney(v));
}
/* ---- 分类预算执行 ---- */
function catBudgetStatusHtml() {
  const ms = moneyMonth;
  const budgets = (D.settings.catBudgets && D.settings.catBudgets[ms]) || {};
  const keys = Object.keys(budgets);
  if (!keys.length) return `<div class="card" style="margin-bottom:16px"><h3>📂 分类预算执行</h3><div class="empty">还没设分类预算 <button class="more" onclick="openCatBudgetModal()">设分类预算</button></div></div>`;
  const adj = moneyView === "amort" ? amortAdjust(ms) : null;
  const list = keys.map((c) => {
    const b = budgets[c];
    let spent = D.money.filter((x) => x.type === "支出" && x.cat === c && moneyCounted(x) && x.date.startsWith(ms)).reduce((a, x) => a + x.amount, 0);
    if (adj) spent = Math.max(0, spent + (adj.byCat[c] || 0));
    const over = spent > b;
    const pct = Math.min(100, Math.round(spent / b * 100));
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${esc(c)}</span>
      <span style="color:${over ? "var(--red)" : "var(--text2)"}">${fmtMoney(spent)} / ${fmtMoney(b)}（${pct}%）</span></div>
      <div class="pbar"><div style="width:${pct}%;background:${over ? "var(--red)" : pct > 80 ? "var(--orange)" : "var(--green)"}"></div></div>
    </div>`;
  }).join("");
  return `<div class="card" style="margin-bottom:16px">
    <h3>📂 分类预算执行 <span class="more" onclick="openCatBudgetModal()">设分类预算</span></h3>
    ${list}</div>`;
}
/* ---- 年度趋势 ---- */
function yearTrendSvg(year, useAmort) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${pad(m)}`;
    const rows = D.money.filter((x) => x.date.startsWith(key) && moneyCounted(x));
    let exp = rows.filter((x) => x.type === "支出").reduce((a, b) => a + b.amount, 0);
    if (useAmort) { const a = amortAdjust(key); exp = Math.max(0, exp - a.removed + a.added); }
    months.push({ m, exp, inc: rows.filter((x) => x.type === "收入").reduce((a, b) => a + b.amount, 0) });
  }
  const max = Math.max(...months.map((x) => Math.max(x.exp, x.inc)), 1);
  const W = 340, H = 170, PB = 22, PT = 12, bw = 10;
  const X = (i) => 16 + i * ((W - 24) / 12);
  const Y = (v) => PT + (1 - v / max) * (H - PT - PB);
  if (!months.some((x) => x.exp || x.inc)) return '<div class="empty">今年还没有账单数据</div>';
  return `<div class="chart-wrap"><svg width="100%" viewBox="0 0 ${W} ${H}" style="min-width:300px">
    ${months.map((x, i) => `
      <rect x="${X(i)}" y="${Y(x.inc)}" width="${bw}" height="${Math.max(0, H - PB - Y(x.inc))}" rx="2" fill="var(--green)" opacity="0.75"><title>${x.m}月收入 ${fmtMoney(x.inc)}</title></rect>
      <rect x="${X(i) + bw + 2}" y="${Y(x.exp)}" width="${bw}" height="${Math.max(0, H - PB - Y(x.exp))}" rx="2" fill="var(--red)" opacity="0.75"><title>${x.m}月支出 ${fmtMoney(x.exp)}</title></rect>
      <text x="${X(i) + bw + 1}" y="${H - 6}" text-anchor="middle" font-size="9" fill="var(--text2)">${x.m}月</text>`).join("")}
    <text x="${W - 4}" y="${PT}" text-anchor="end" font-size="9" fill="var(--text2)">■绿=收入 ■红=支出 · 峰值${fmtMoney(max)}</text>
  </svg></div>`;
}
function moneyPieSvg(cats, exp) {
  if (!cats.length) return '';
  const palette = ["#4f6ef7", "#0d9488", "#f59e0b", "#e11d48", "#8b5cf6", "#16a34a", "#06b6d4", "#ec4899", "#84cc16", "#f97316"];
  const R = 52, C = 2 * Math.PI * R, cx = 60, cy = 60;
  let acc = 0;
  const segs = cats.map(([c, v], i) => {
    const len = (v / exp) * C;
    const el = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${palette[i % palette.length]}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    acc += len; return el;
  }).join("");
  const legend = cats.map(([c, v], i) => `<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin:2px 0"><span style="width:10px;height:10px;border-radius:3px;background:${palette[i % palette.length]};display:inline-block"></span>${esc(c)} ${fmtMoney(v)} (${Math.round(v / exp * 100)}%)</div>`).join("");
  return `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
    <svg width="120" height="120" viewBox="0 0 120 120">${segs}<circle cx="${cx}" cy="${cy}" r="34" fill="var(--card)"/><text x="${cx}" y="56" text-anchor="middle" font-size="11" fill="var(--text2)">支出</text><text x="${cx}" y="70" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">${fmtMoney(exp)}</text></svg>
    <div style="flex:1;min-width:140px">${legend}</div></div>`;
}
/* ================= 周期性产品摊销（大额耐用品持有成本） =================
   把「一次性买断、长期使用」的产品（手机 / 家电 / 家具 / 年卡）按使用时长摊到每一天，
   总账里就不会出现单月的巨额突刺，而是反映真实的「每天在为它花多少钱」。
   与「固定支出模板」「周期性账单」的区别：那两个是每月真的要再付一次钱，这个是钱已付清、成本按天释放。 */
const AMORT_UNITS = [{ k: "day", label: "天" }, { k: "week", label: "周" }, { k: "month", label: "个月" }, { k: "year", label: "年" }];
const amortFmtDate = (d) => (d && !isNaN(d)) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "-";
function amortStart(it) { const d = new Date((it.buyDate || "") + "T00:00:00"); return isNaN(d) ? null : d; }
function amortEnd(it) { // 排他端点：使用期最后一天的次日
  const s = amortStart(it); if (!s) return null;
  const e = new Date(s.getTime()), n = Math.max(0, Number(it.dur) || 0);
  if (it.unit === "day") e.setDate(e.getDate() + n);
  else if (it.unit === "week") e.setDate(e.getDate() + n * 7);
  else if (it.unit === "year") e.setFullYear(e.getFullYear() + n);
  else e.setMonth(e.getMonth() + n);
  return e;
}
function amortTotalDays(it) { const s = amortStart(it), e = amortEnd(it); return (!s || !e) ? 0 : Math.max(1, Math.round((e - s) / 86400000)); }
function amortDaily(it) { const d = amortTotalDays(it); return d ? (Number(it.amount) || 0) / d : 0; }
function amortWeekly(it) { return amortDaily(it) * 7; }
function amortMonthly(it) { return amortDaily(it) * 365.2425 / 12; }
/* 该产品落在某个自然月内的摊销额：按天精确计算，自动处理首月/末月不满月 */
function amortInMonth(it, ym) {
  const s = amortStart(it), e = amortEnd(it);
  if (!s || !e || !ym) return 0;
  const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
  if (!y || !m) return 0;
  const a = Math.max(s.getTime(), new Date(y, m - 1, 1).getTime());
  const b = Math.min(e.getTime(), new Date(y, m, 1).getTime());
  return b <= a ? 0 : amortDaily(it) * Math.round((b - a) / 86400000);
}
function amortProgress(it) {
  const s = amortStart(it), e = amortEnd(it), total = amortTotalDays(it);
  if (!s || !e) return { total, used: 0, left: total, pct: 0, done: false };
  const used = Math.min(total, Math.max(0, Math.round((Date.now() - s.getTime()) / 86400000)));
  return { total, used, left: Math.max(0, total - used), pct: total ? Math.min(100, Math.round(used / total * 100)) : 0, done: Date.now() >= e.getTime() };
}
/* 摊销口径调整：把「已认领的一次性大额」换成「本月应摊金额」 */
function amortAdjust(ym) {
  let added = 0, removed = 0; const byCat = {};
  (D.amortItems || []).forEach((it) => {
    const v = amortInMonth(it, ym);
    if (v > 0) { added += v; const c = it.cat || "其他"; byCat[c] = (byCat[c] || 0) + v; }
  });
  D.money.forEach((x) => {
    if (x.type === "支出" && x.amortId && moneyCounted(x) && x.date.startsWith(ym)) {
      removed += x.amount; byCat[x.cat] = (byCat[x.cat] || 0) - x.amount;
    }
  });
  return { added, removed, byCat };
}
function amortCardHtml() {
  const items = (D.amortItems || []).slice().sort((a, b) => String(b.buyDate || "").localeCompare(String(a.buyDate || "")));
  const active = items.filter((it) => !amortProgress(it).done);
  const dSum = active.reduce((a, it) => a + amortDaily(it), 0);
  const mThis = items.reduce((a, it) => a + amortInMonth(it, moneyMonth), 0);
  const head = `<h3>🧾 周期性产品摊销 <button class="more" onclick="addAmortDemo()">✨ 一键示例</button> <button class="more" onclick="openAmortModal()">+ 添加产品 ›</button></h3>`;
  if (!items.length) {
    return `<div class="card" style="margin-bottom:16px">${head}
      <div class="empty">把手机、家电、家具、年卡这类「一次性花大钱、要用很久」的东西登记进来，<br>填上打算用多久，价钱就会自动摊到每一天，不再让某个月的账单突然爆表。</div>
      <button class="btn sm" onclick="addAmortDemo()">✨ 放个示例看看</button> <button class="btn sm" onclick="openAmortModal()">🧾 登记第一件产品</button></div>`;
  }
  const rows = items.map((it) => {
    const p = amortProgress(it), daily = amortDaily(it), amount = Number(it.amount) || 0;
    const spent = Math.min(amount, daily * p.used), rest = Math.max(0, amount - spent);
    const thisM = amortInMonth(it, moneyMonth);
    const linked = D.money.find((x) => x.amortId === it.id);
    const unit = (AMORT_UNITS.find((u) => u.k === it.unit) || { label: "" }).label;
    const endD = amortEnd(it); const endShow = endD ? new Date(endD.getTime() - 86400000) : null;
    return `<div class="list-item" style="align-items:flex-start">
      <span class="tag ${p.done ? "lo" : "hi"}">${esc(it.cat || "其他")}</span>
      <div class="grow">
        <div class="title">${esc(it.name)}${p.done ? ' <span class="tag lo">已到期</span>' : ""}${linked ? ' <span class="tag purple" title="已关联实付账单">🔗已认领账单</span>' : ""}</div>
        <div class="sub">${fmtMoney(amount)} · 用 ${it.dur}${unit} · ${it.buyDate} → ${amortFmtDate(endShow)}${it.note ? " · " + esc(it.note) : ""}</div>
        <div class="pbar" style="margin:6px 0 4px"><div style="width:${p.pct}%;background:${p.done ? "var(--text2)" : p.pct > 80 ? "var(--orange)" : "var(--green)"}"></div></div>
        <div class="sub">已用 ${p.used}/${p.total} 天（${p.pct}%）· 已摊 ${fmtMoney(spent)} · 剩余价值 ${fmtMoney(rest)}</div>
        ${!linked ? `<button class="more" style="background:none;border:none;color:var(--primary);font-size:12px;cursor:pointer;padding:4px 0" onclick="openAmortLink('${it.id}')">🔗 之前手动记过这笔？点这里认领，避免重复计算</button>` : ""}
      </div>
      <div style="text-align:right;flex:none">
        <b style="color:var(--primary)">${fmtMoney(daily)}<span style="font-size:11px;font-weight:400">/天</span></b>
        <div class="sub">周 ${fmtMoney(amortWeekly(it))} · 月 ${fmtMoney(amortMonthly(it))}</div>
        <div class="sub" style="color:${thisM > 0 ? "var(--red)" : "var(--text2)"}">${moneyMonth.slice(5)}月计入 ${fmtMoney(thisM)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex:none">
        <button class="icon-btn" title="编辑" onclick="openAmortModal('${it.id}')">✏️</button>
        <button class="icon-btn" title="删除" onclick="delAmort('${it.id}')">✕</button>
      </div>
    </div>`;
  }).join("");
  return `<div class="card" style="margin-bottom:16px">${head}
    <div style="display:flex;gap:14px;flex-wrap:wrap;padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:10px;font-size:13px">
      <span>在役 <b>${active.length}</b> 件</span>
      <span>每天 <b style="color:var(--primary)">${fmtMoney(dSum)}</b></span>
      <span>每周 <b>${fmtMoney(dSum * 7)}</b></span>
      <span>每月 <b>${fmtMoney(dSum * 365.2425 / 12)}</b></span>
      <span style="margin-left:auto">${moneyMonth.slice(5)}月应摊 <b style="color:var(--red)">${fmtMoney(mThis)}</b></span>
    </div>
    ${rows}</div>`;
}
function addAmortDemo() {
  if (!Array.isArray(D.amortItems)) D.amortItems = [];
  if (D.amortItems.some((x) => x.demo)) {
    moneyView = "amort"; renderMoney();
    return toast("示例已添加，点上方「💵 现金流 / 🧾 摊销」切换看差异");
  }
  const buy = todayStr();
  const it = { id: uid(), name: "电动牙刷（示例）", amount: 199, dur: 2, unit: "year", buyDate: buy, cat: "购物", note: "示例·可删除", demo: true, created: Date.now(), updatedAt: Date.now() };
  D.amortItems.push(it);
  D.money.push({ id: uid(), date: buy, type: "支出", cat: "购物", amount: 199, note: "电动牙刷（示例）", amortId: it.id, created: Date.now(), updatedAt: Date.now() });
  save();
  moneyView = "amort";
  renderMoney();
  toast("示例已添加：现金流里记了 199 元 → 摊销后本月仅约 " + fmtMoney(amortInMonth(it, moneyMonth)) + "，切回「💵 现金流」对比看差异");
}
function openAmortModal(id) {
  const it = id ? (D.amortItems || []).find((x) => x.id === id) : null;
  const cats = MONEY_CATS["支出"] || [];
  openModal(`<h3>${it ? "✏️ 编辑周期性产品" : "🧾 添加周期性产品"}</h3>
    <div class="sub" style="margin-bottom:10px">一次性买断、长期使用的大额物品。填入预计使用时长后，价钱会自动摊到每一天。</div>
    <div class="form-row">
      <input id="am-name" placeholder="产品名称，如：iPhone / 洗烘一体机 / 健身年卡" value="${it ? esc(it.name) : ""}">
      <select id="am-cat" style="flex:0 1 120px">${cats.map((c) => `<option${it && it.cat === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
    </div>
    <div class="form-row">
      <input id="am-amount" type="number" min="0" step="0.01" placeholder="产品总价" value="${it ? it.amount : ""}">
      <input id="am-dur" type="number" min="1" step="1" placeholder="打算用多久" value="${it ? it.dur : ""}" style="flex:0 1 130px">
      <select id="am-unit" style="flex:0 1 90px">${AMORT_UNITS.map((u) => `<option value="${u.k}"${(it ? it.unit === u.k : u.k === "year") ? " selected" : ""}>${u.label}</option>`).join("")}</select>
    </div>
    <div class="form-row">
      <input id="am-date" type="date" value="${it ? it.buyDate : todayStr()}">
      <input id="am-note" placeholder="备注(可选)" value="${it ? esc(it.note || "") : ""}">
    </div>
    ${it ? "" : `<label style="display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--text2);margin:2px 0 10px;line-height:1.5">
      <input type="checkbox" id="am-rec" checked style="width:16px;height:16px;flex:none;margin-top:1px"> 同时在账单里记一笔实付支出（真实现金流）。切到「摊销口径」时，这笔大额会自动换成按天摊平的金额，不会重复计算。</label>`}
    <div id="am-preview" class="sub" style="margin:0 0 12px;padding:8px 10px;background:var(--bg);border-radius:8px"></div>
    <div style="display:flex;gap:8px"><button class="btn" onclick="saveAmort('${it ? it.id : ""}')">${it ? "保存修改" : "添加"}</button><button class="btn gray" onclick="closeModal()">取消</button></div>`);
  ["am-amount", "am-dur", "am-unit", "am-date"].forEach((k) => {
    const el = $("#" + k); if (!el) return;
    el.addEventListener("input", amortPreview); el.addEventListener("change", amortPreview);
  });
  amortPreview();
}
function amortPreview() {
  const box = $("#am-preview"); if (!box) return;
  const t = { amount: parseFloat($("#am-amount").value) || 0, dur: parseFloat($("#am-dur").value) || 0, unit: $("#am-unit").value, buyDate: $("#am-date").value };
  if (!t.amount || !t.dur || !t.buyDate) { box.innerHTML = "填好总价与使用时长后，这里会实时算出每天成本"; return; }
  const e = amortEnd(t), endShow = e ? new Date(e.getTime() - 86400000) : null;
  box.innerHTML = `💡 折合 <b style="color:var(--primary)">${fmtMoney(amortDaily(t))} / 天</b> · ${fmtMoney(amortWeekly(t))} / 周 · ${fmtMoney(amortMonthly(t))} / 月<br>
    共 ${amortTotalDays(t)} 天，用到 ${amortFmtDate(endShow)}`;
}
function saveAmort(id) {
  const name = $("#am-name").value.trim();
  const amount = parseFloat($("#am-amount").value);
  const dur = parseFloat($("#am-dur").value);
  const unit = $("#am-unit").value, buyDate = $("#am-date").value;
  const cat = $("#am-cat").value, note = $("#am-note").value.trim();
  if (!name) return toast("请填写产品名称");
  if (!amount || amount <= 0) return toast("请填写产品总价");
  if (!dur || dur <= 0) return toast("请填写预计使用时长");
  if (!buyDate) return toast("请选择购买日期");
  if (!Array.isArray(D.amortItems)) D.amortItems = [];
  if (id) {
    const it = D.amortItems.find((x) => x.id === id);
    if (!it) return toast("记录不存在");
    Object.assign(it, { name, amount, dur, unit, buyDate, cat, note, updatedAt: Date.now() });
    save(); closeModal(); renderMoney(); return toast("已更新 · 折合 " + fmtMoney(amortDaily(it)) + "/天");
  }
  const it = { id: uid(), name, amount, dur, unit, buyDate, cat, note, created: Date.now(), updatedAt: Date.now() };
  D.amortItems.push(it);
  const rec = $("#am-rec");
  if (rec && rec.checked) D.money.push({ id: uid(), date: buyDate, type: "支出", cat, amount, note: name, amortId: it.id, created: Date.now(), updatedAt: Date.now() });
  save(); closeModal(); renderMoney();
  toast("已添加 · 折合 " + fmtMoney(amortDaily(it)) + "/天");
}
function delAmort(id) {
  const it = (D.amortItems || []).find((x) => x.id === id);
  const isDemo = !!(it && it.demo);
  appConfirm("删除这件产品的摊销记录？" + (isDemo ? "示例关联的 199 元实付账单也会一并删除。" : "已记入账单的实付金额不会被删除。"), () => {
    tombstone(id);
    D.amortItems = (D.amortItems || []).filter((x) => x.id !== id);
    if (isDemo) {
      D.money = D.money.filter((x) => x.amortId !== id);
    } else {
      D.money.forEach((x) => { if (x.amortId === id) { delete x.amortId; x.updatedAt = Date.now(); } });
    }
    save(); renderMoney(); toast("已删除");
  });
}
function openAmortLink(id) {
  const it = (D.amortItems || []).find((x) => x.id === id);
  if (!it) return;
  const ym = String(it.buyDate || "").slice(0, 7);
  const cand = D.money.filter((x) => x.type === "支出" && !x.amortId && x.date.startsWith(ym)).sort((a, b) => b.amount - a.amount);
  openModal(`<h3>🔗 认领已有账单</h3>
    <div class="sub" style="margin-bottom:10px">如果买「${esc(it.name)}」时你已经手动记过一笔账，在这里认领它。认领后，摊销口径会把这笔一次性大额替换成按天摊平的金额，<b>避免重复计算</b>。</div>
    ${cand.length ? cand.map((x) => `<div class="list-item" style="cursor:pointer" onclick="linkAmort('${it.id}','${x.id}')">
      <span class="tag hi">${esc(x.cat)}</span>
      <div class="grow"><div class="title">${esc(x.note) || esc(x.cat)}</div><div class="sub">${x.date}</div></div>
      <b style="color:var(--red)">${fmtMoney(x.amount)}</b></div>`).join("") : `<div class="empty">${ym} 没有可认领的支出账单</div>`}
    <div style="margin-top:10px"><button class="btn gray" onclick="closeModal()">关闭</button></div>`);
}
function linkAmort(itemId, moneyId) {
  const m = D.money.find((x) => x.id === moneyId);
  if (!m) return;
  m.amortId = itemId; m.updatedAt = Date.now();
  save(); closeModal(); renderMoney(); toast("已认领，摊销口径下不再重复计算");
}
function unlinkAmort(moneyId) {
  const m = D.money.find((x) => x.id === moneyId);
  if (!m) return;
  delete m.amortId; m.updatedAt = Date.now();
  save(); renderMoney(); toast("已取消关联");
}
/* ---- 固定支出模板 ---- */
function openFixedTplModal() {
  openModal(`<h3>📌 添加固定支出模板</h3>
    <div class="form-row">
      <select id="ft-cat">${MONEY_CATS["支出"].map((c) => `<option>${c}</option>`).join("")}</select>
      <input id="ft-amount" type="number" placeholder="每月金额" min="0" step="0.01">
    </div>
    <div class="form-row"><input id="ft-note" placeholder="名称，如：房租 / 话费 / 视频会员"></div>
    <div style="display:flex;gap:8px"><button class="btn" onclick="addFixedTpl()">保存模板</button><button class="btn gray" onclick="closeModal()">取消</button></div>`);
}
function addFixedTpl() {
  const amount = parseFloat($("#ft-amount").value);
  if (!amount || amount <= 0) return toast("请输入金额");
  D.fixedExpenses.push({ id: uid(), cat: $("#ft-cat").value, amount, note: $("#ft-note").value.trim() });
  save(); closeModal(); renderMoney(); toast("模板已保存");
}
function delFixedTpl(id) { tombstone(id); D.fixedExpenses = D.fixedExpenses.filter((x) => x.id !== id); save(); renderMoney(); }
function applyFixedTpl(id) {
  const f = D.fixedExpenses.find((x) => x.id === id);
  if (!f) return;
  if (D.money.some((x) => x.fixedId === id && x.date.startsWith(moneyMonth))) return toast("本月已记过该固定支出");
  const date = monthStr() === moneyMonth ? todayStr() : moneyMonth + "-01";
  D.money.push({ id: uid(), date, type: "支出", cat: f.cat, amount: f.amount, note: f.note || f.cat, fixedId: f.id });
  save(); renderMoney(); toast("已记入：" + (f.note || f.cat) + " " + fmtMoney(f.amount));
}
function applyAllFixedTpl() {
  let n = 0;
  D.fixedExpenses.forEach((f) => {
    if (!D.money.some((x) => x.fixedId === f.id && x.date.startsWith(moneyMonth))) {
      const date = monthStr() === moneyMonth ? todayStr() : moneyMonth + "-01";
      D.money.push({ id: uid(), date, type: "支出", cat: f.cat, amount: f.amount, note: f.note || f.cat, fixedId: f.id });
      n++;
    }
  });
  save(); renderMoney(); toast(n ? `已一键记入 ${n} 笔固定支出` : "本月固定支出都记过了");
}
function addMoney() {
  const amount = parseFloat($("#mn-amount").value);
  if (!amount || amount <= 0) return toast("请输入金额");
  const rec = { id: uid(), date: $("#mn-date").value || todayStr(), type: $("#mn-type").value, cat: $("#mn-cat").value, amount, note: $("#mn-note").value.trim() };
  const tripSel = $("#mn-trip");
  if (tripSel && tripSel.value) { rec.tripId = tripSel.value; rec.inTotal = $("#mn-intotal").checked; }
  D.money.push(rec);
  save(); renderMoney();
  const bm = rec.date.slice(0, 7);
  const b = D.moneyBudgets[bm];
  if (b) { const ne = D.money.filter((x) => x.date.startsWith(bm) && x.type === "支出" && moneyCounted(x)).reduce((a, c) => a + c.amount, 0); if (ne > b) setTimeout(() => toast("⚠️ 已超 " + bm.slice(5) + " 月预算 " + fmtMoney(ne - b)), 350); }
  toast(rec.tripId ? (rec.inTotal ? "已记账（旅行+总账）" : "已记账（仅旅行账本）") : "已记账");
}
function delMoney(id) { tombstone(id); D.money = D.money.filter((x) => x.id !== id); save(); renderMoney(); }

/* ================= 当日热点 ================= */
let hotType = "wbHot";
const HOT_TYPES = [["wbHot", "微博"], ["douyinHot", "抖音"], ["baiduRD", "百度"], ["zhihuHot", "知乎"], ["36Ke", "36氪"], ["political", "📰 时政"]];
const POLI_SOURCES = [
  {name:'央视新闻', url:'https://www.douyin.com/search/%E5%A4%AE%E8%A7%86%E6%96%B0%E9%97%BB'},
  {name:'人民日报', url:'https://www.douyin.com/search/%E4%BA%BA%E6%B0%91%E6%97%A5%E6%8A%A5'},
  {name:'新华网', url:'https://www.douyin.com/search/%E6%96%B0%E5%8D%8E%E7%BD%91'},
  {name:'头条新闻', url:'https://www.douyin.com/search/%E5%A4%B4%E6%9D%A1%E6%96%B0%E9%97%BB'}
];
let hotCache = {};
function renderHot() {
  $("#sec-hot").innerHTML = `
  <div class="card">
    <div class="hot-tabs">${HOT_TYPES.map(([k, n]) => `<button class="hot-tab ${hotType === k ? "active" : ""}" onclick="hotType='${k}';renderHot()">${n}</button>`).join("")}
      <span style="flex:1"></span><button class="btn sm ghost" onclick="delete hotCache['${hotType}'];renderHot()">↻ 刷新</button></div>
    <div id="hot-list"><div class="empty">加载中…</div></div>
  </div>`;
  loadHot();
}
async function loadHot() {
  const box = $("#hot-list");
  if (hotCache[hotType]) { box.innerHTML = hotCache[hotType]; return; }
  if (hotType === "political") {
    const idx = Math.floor(Date.now() / 86400000) % POLI_SOURCES.length;
    const featured = POLI_SOURCES[idx];
    const user = D.poliNews || [];
    const recent = user.slice().reverse();
    const html = `
    <div class="hot-item" style="background:var(--primary-soft);border-radius:10px;padding:12px">
      <span class="hot-rank">📰</span>
      <div style="flex:1">
        <div style="font-weight:700;margin-bottom:6px">今日推荐 · ${esc(featured.name)}</div>
        <a href="${safeUrl(featured.url)}" target="_blank" rel="noopener" style="color:var(--primary)">打开 ${esc(featured.name)} 短视频频道</a>
      </div>
    </div>
    <div style="margin:14px 0 8px;font-weight:700">权威新闻入口</div>
    ${POLI_SOURCES.map((s, i) => `<div class="hot-item"><span class="hot-rank">${i + 1}</span><a href="${safeUrl(s.url)}" target="_blank" rel="noopener">${esc(s.name)} 短视频频道</a></div>`).join("")}
    <div style="margin:14px 0 8px;font-weight:700">我的时政收藏</div>
    <div class="form-row" style="margin-bottom:10px">
      <input id="poli-title" placeholder="标题" style="flex:2">
      <input id="poli-url" placeholder="链接（抖音/ B站/ 小红书等）">
      <button class="btn sm" onclick="addPoliNews()">+ 添加</button>
    </div>
    ${recent.length ? recent.map(x => `<div class="hot-item"><span class="hot-rank">📌</span><a href="${safeUrl(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a><button class="icon-btn" onclick="delPoliNews('${x.id}')">✕</button></div>`).join("") : '<div class="empty" style="padding:8px 0">暂无收藏，可添加今日关注的时政新闻</div>'}`;
    hotCache[hotType] = html;
    box.innerHTML = html;
    return;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://api.vvhan.com/api/hotlist/${hotType}`, { signal: ctrl.signal });
    clearTimeout(timer);
    const j = await res.json();
    if (!j.success || !j.data) throw new Error("no data");
    const html = j.data.slice(0, 30).map((x, i) => `<div class="hot-item">
      <span class="hot-rank">${i + 1}</span>
      <a href="${esc(safeUrl(x.url || x.mobil_url))}" target="_blank" rel="noopener">${esc(x.title)}</a>
      <span class="hot-heat">${esc(x.hot || "")}</span></div>`).join("");
    hotCache[hotType] = html;
    box.innerHTML = html;
  } catch (e) {
    box.innerHTML = `<div class="empty">热点加载失败（接口可能临时不可用）<br><br>
      <a href="https://s.weibo.com/top/summary" target="_blank" style="color:var(--primary)">微博热搜</a> ·
      <a href="https://www.douyin.com/hot" target="_blank" style="color:var(--primary)">抖音热榜</a> ·
      <a href="https://top.baidu.com/board" target="_blank" style="color:var(--primary)">百度热搜</a></div>`;
  }
}
function addPoliNews() {
  const title = $("#poli-title").value.trim();
  const url = $("#poli-url").value.trim();
  if (!title || !url) return toast("请输入标题和链接");
  if (!D.poliNews) D.poliNews = [];
  D.poliNews.push({ id: uid(), date: todayStr(), title, url });
  save();
  delete hotCache.political;
  loadHot();
  toast("已添加时政收藏");
}
function delPoliNews(id) {
  tombstone(id);
  if (!D.poliNews) D.poliNews = [];
  D.poliNews = D.poliNews.filter(x => x.id !== id);
  save();
  delete hotCache.political;
  loadHot();
}

/* ---------- 新增模块常量 ---------- */
const WELLNESS_TAGS = ['饮食养生','作息调养','运动保健','节气养生','四季调理','情志养生','穴位按摩'];
const WELLNESS_TIPS = [
  {tag:'饮食养生', title:'晨起一杯温水', note:'起床后30分钟内喝一杯温水，促进肠胃蠕动与代谢。', url:'https://www.douyin.com/search/%E6%99%A8%E8%B5%B7%E5%96%9D%E6%B0%B4'},
  {tag:'饮食养生', title:'多吃深色蔬菜', note:'每天摄入300-500g蔬菜，深色蔬菜占一半以上。', url:'https://www.douyin.com/search/%E6%B7%B1%E8%89%B2%E8%94%AC%E8%8F%9C%E5%85%BB%E7%94%9F'},
  {tag:'作息调养', title:'子时前入睡', note:'23点前入睡，养肝血、助排毒，长期熬夜伤阴。', url:'https://www.douyin.com/search/%E5%AD%90%E6%97%B6%E7%9D%A1%E7%9C%A0'},
  {tag:'运动保健', title:'八段锦每日12分钟', note:'八段锦动作柔和，适合久坐后舒展筋骨。', url:'https://www.douyin.com/search/%E5%85%AB%E6%AE%B5%E9%94%A6'},
  {tag:'节气养生', title:'顺应节气饮食', note:'春养肝、夏养心、秋养肺、冬养肾，按节气调整食材。', url:'https://www.douyin.com/search/%E8%8A%82%E6%B0%94%E5%85%BB%E7%94%9F'},
  {tag:'穴位按摩', title:'按揉足三里', note:'足三里是胃经合穴，每日按揉3分钟，健脾胃。', url:'https://www.douyin.com/search/%E8%B6%B3%E4%B8%89%E9%87%8C%E7%A9%B4%E4%BD%8D'},
  {tag:'情志养生', title:'午休养心20分钟', note:'午间小憩20分钟，缓解疲劳、提升下午专注力。', url:'https://www.douyin.com/search/%E5%8D%88%E7%9D%A1%E5%85%BB%E7%94%9F'},
  {tag:'运动保健', title:'饭后百步走', note:'饭后30分钟慢走15-20分钟，助消化、稳血糖。', url:'https://www.douyin.com/search/%E9%A5%AD%E5%90%8E%E6%95%A3%E6%AD%A5'},
  {tag:'四季调理', title:'冬吃萝卜夏吃姜', note:'冬季滋阴润燥吃白萝卜，夏季温胃散寒吃生姜。', url:'https://www.douyin.com/search/%E5%86%AC%E5%90%83%E8%90%9D%E8%8A%A1%E5%A4%8F%E5%90%83%E5%A7%9C'},
  {tag:'饮食养生', title:'少盐少油控糖', note:'每日盐<5g、油<25g、添加糖<25g，降低慢病风险。', url:'https://www.douyin.com/search/%E5%B0%91%E7%9B%90%E5%B0%91%E6%B2%B9'},
  {tag:'穴位按摩', title:'睡前泡脚', note:'睡前温水泡脚15分钟，引火归元、助眠安神。', url:'https://www.douyin.com/search/%E6%B3%A1%E8%84%9A%E5%85%BB%E7%94%9F'},
  {tag:'情志养生', title:'深呼吸减压', note:'每天3次腹式呼吸，每次5分钟，缓解焦虑。', url:'https://www.douyin.com/search/%E8%85%B9%E5%BC%8F%E5%91%BC%E5%90%B8'}
];
const TAROT_DECK = [
  {name:'The Fool', cn:'愚人', keyword:'新的开始、冒险、纯真', up:'放下顾虑，勇敢迈出第一步。', rev:'谨慎行事，避免盲目冲动。'},
  {name:'The Magician', cn:'魔术师', keyword:'创造力、行动力、资源整合', up:'你已具备实现目标的能力，现在就去行动。', rev:'警惕欺骗或资源浪费，重新聚焦。'},
  {name:'The High Priestess', cn:'女祭司', keyword:'直觉、潜意识、智慧', up:'相信直觉，答案藏在内心深处。', rev:'不要被表象迷惑，多观察再决定。'},
  {name:'The Empress', cn:'皇后', keyword:'丰盛、滋养、创造', up:'享受当下成果，也慷慨给予。', rev:'避免过度依赖，关注自我滋养。'},
  {name:'The Emperor', cn:'皇帝', keyword:'秩序、权威、稳定', up:'建立规则与边界，稳扎稳打。', rev:'不要过于控制，适度放权。'},
  {name:'The Hierophant', cn:'教皇', keyword:'传统、学习、信仰', up:'尊重经验与规则，向师长请教。', rev:'打破陈规，寻找自己的道路。'},
  {name:'The Lovers', cn:'恋人', keyword:'选择、关系、价值观', up:'做符合内心的选择，关系和谐。', rev:'避免犹豫或受外界左右。'},
  {name:'The Chariot', cn:'战车', keyword:'意志力、胜利、前进', up:'坚定目标，集中意志克服阻碍。', rev:'调整方向，避免硬碰硬。'},
  {name:'Strength', cn:'力量', keyword:'勇气、耐心、内在力量', up:'以柔克刚，用耐心化解冲突。', rev:'别被情绪控制，找回自信。'},
  {name:'The Hermit', cn:'隐士', keyword:'独处、内省、指引', up:'暂时抽离，寻求内在答案。', rev:'不要过度封闭，适时寻求帮助。'},
  {name:'Wheel of Fortune', cn:'命运之轮', keyword:'变化、机遇、周期', up:'顺势而为，把握转机。', rev:'接受波动，静待时机。'},
  {name:'Justice', cn:'正义', keyword:'公正、因果、平衡', up:'诚实面对自己，承担应有的责任。', rev:'避免偏见，重新评估决定。'},
  {name:'The Hanged Man', cn:'倒吊人', keyword:'暂停、牺牲、新视角', up:'换个角度看问题，会有新领悟。', rev:'不要固执，及时止损。'},
  {name:'Death', cn:'死神', keyword:'结束、转化、新生', up:'旧阶段结束，为新开始腾出空间。', rev:'抗拒改变只会让痛苦延长。'},
  {name:'Temperance', cn:'节制', keyword:'平衡、调和、耐心', up:'保持中庸，循序渐进。', rev:'避免极端，重新找回平衡。'},
  {name:'The Devil', cn:'恶魔', keyword:'束缚、欲望、执念', up:'看清束缚你的东西，主动挣脱。', rev:'摆脱依赖，重获自由。'},
  {name:'The Tower', cn:'高塔', keyword:'突变、觉醒、打破', up:'突如其来的变化带来清醒，接受重建。', rev:'从危机中反思，避免重蹈覆辙。'},
  {name:'The Star', cn:'星星', keyword:'希望、疗愈、灵感', up:'保持信心，愿望正在靠近。', rev:'别失去信心，疗愈需要时间。'},
  {name:'The Moon', cn:'月亮', keyword:'幻觉、不安、潜意识', up:'面对不安，相信直觉会带你走出迷雾。', rev:'别让恐惧左右判断，寻求事实。'},
  {name:'The Sun', cn:'太阳', keyword:'成功、快乐、活力', up:'光明坦途，尽情享受喜悦。', rev:'短暂的阴霾，快乐会回来。'},
  {name:'Judgement', cn:'审判', keyword:'觉醒、评估、重生', up:'诚实自我评估，迎接人生新阶段。', rev:'别逃避过去，放下才能前行。'},
  {name:'The World', cn:'世界', keyword:'完成、圆满、整合', up:'一个周期圆满完成，准备迈向新高度。', rev:'还有未完成的功课，别急于开始新目标。'}
];
const TAO_METHODS = [['liuren','小六壬'],['liuyao','六爻'],['meihua','梅花易数'],['bagua','五行八卦']];
const LIUREN = [
  {name:'大安', meaning:'万事顺遂，宜静守，求财利，出行吉。'},
  {name:'留连', meaning:'事有阻滞，宜缓行，守旧待时。'},
  {name:'速喜', meaning:'喜事临门，消息快至，宜主动。'},
  {name:'赤口', meaning:'口舌是非，宜慎言，避免争执。'},
  {name:'小吉', meaning:'小事可成，循序渐进，略有收获。'},
  {name:'空亡', meaning:'事多反复，宜守不宜攻，静待时机。'}
];
const TRIGRAMS = [
  {name:'乾', nature:'天', desc:'刚健、创造、领导', yao:'111'},
  {name:'坤', nature:'地', desc:'包容、承载、柔顺', yao:'000'},
  {name:'震', nature:'雷', desc:'震动、行动、奋发', yao:'100'},
  {name:'巽', nature:'风', desc:'渗透、柔顺、渐进', yao:'011'},
  {name:'坎', nature:'水', desc:'险阻、智慧、流动', yao:'010'},
  {name:'离', nature:'火', desc:'光明、依附、文明', yao:'101'},
  {name:'艮', nature:'山', desc:'止静、稳重、节制', yao:'001'},
  {name:'兑', nature:'泽', desc:'喜悦、沟通、口舌', yao:'110'}
];
const HEXAGRAMS = [
  {name:'乾为天', gua:'111111', meaning:'天行健，君子以自强不息。事业初盛，宜积极进取。'},
  {name:'坤为地', gua:'000000', meaning:'地势坤，君子以厚德载物。宜包容忍让，顺势而行。'},
  {name:'水雷屯', gua:'010100', meaning:'万事开头难，宜积聚力量，不可冒进。'},
  {name:'山水蒙', gua:'001100', meaning:'启蒙求学，虚心请教，不可自以为是。'},
  {name:'水天需', gua:'010111', meaning:'等待时机，蓄力待发，不可急躁。'},
  {name:'天水讼', gua:'101111', meaning:'争端初起，宜退让和解，避免诉讼。'},
  {name:'地水师', gua:'000010', meaning:'出师远行，纪律为上，不可轻敌。'},
  {name:'水地比', gua:'010000', meaning:'亲比互助，得道多助，宜合作。'},
  {name:'风天小畜', gua:'011111', meaning:'小有积蓄，力量尚弱，宜蓄养待时。'},
  {name:'天泽履', gua:'111110', meaning:'如履薄冰，谨慎行事，循礼而行。'},
  {name:'地天泰', gua:'000111', meaning:'天地交泰，阴阳和谐，诸事顺遂。'},
  {name:'天地否', gua:'111000', meaning:'天地不交，诸事闭塞，宜守不宜攻。'},
  {name:'天火同人', gua:'111101', meaning:'同人于野，利涉大川，宜团结共事。'},
  {name:'火天大有', gua:'101111', meaning:'大有收获，正当其时，宜分享成果。'},
  {name:'地山谦', gua:'000001', meaning:'谦受益，满招损，低调行事可得助力。'},
  {name:'雷地豫', gua:'100000', meaning:'和乐安详，但不可沉溺享乐，宜未雨绸缪。'}
];
let wellnessTag = 'all';
let taoMethod = 'liuren';
let tarotMode = 'daily';
const TAROT_MODES = [['daily','每日一牌'],['flow','时间之流'],['triangle','关系三角'],['choice','二择抉择']];
let __wellnessTip = dailyWellnessTip();

/* 每日 B站 推荐抓取已移除（纯前端无法定时运行 + 平台无通用内嵌） */

/* ================= 养生知识 ================= */
function dailyWellnessTip() {
  const idx = Math.floor(Date.now() / 86400000) % WELLNESS_TIPS.length;
  return WELLNESS_TIPS[idx];
}
function renderWellness() {
  ensureDailyQuests();
  const t = todayStr();
  const tagFilter = wellnessTag || 'all';
  const list = (D.wellness || []).slice().reverse();
  const filtered = tagFilter === 'all' ? list : list.filter((x) => x.tag === tagFilter);
  const tip = __wellnessTip;
  const todayDone = D.dailyQuests.wellness;
  $('#sec-wellness').innerHTML = `
  ${moduleHeaderHtml('wellness','养生知识','饮食 · 作息 · 运动 · 节气')}
  <div class="quest-task-card ${todayDone ? 'done' : ''}">
    <div class="qtc-check">${todayDone ? '✅' : '⭕'}</div>
    <div class="qtc-body">
      <div class="qtc-title">今日任务 (${todayDone ? '1/1' : '0/1'})</div>
      <div class="qtc-desc">收藏今日养生推荐并观看一个养生视频</div>
      <div class="qtc-from">来自 养生知识</div>
    </div>
    <div class="qtc-reward">+1 ⭐</div>
  </div>
  <div class="grid cols-2">
    <div>
      <div class="card wellness-board" style="margin-bottom:16px">
        <h3>🌿 今日养生推荐</h3>
        <div style="font-size:20px;font-weight:700;color:var(--green);margin:8px 0">${esc(tip.title)}</div>
        <span class="tag lo" style="margin-bottom:8px;display:inline-block">${esc(tip.tag)}</span>
        <p style="margin:8px 0">${esc(tip.note)}</p>
        <a class="btn sm" href="${safeUrl(tip.url)}" target="_blank" rel="noopener">▶ 看视频讲解</a>
        <button class="btn sm ghost" style="margin-top:6px" onclick='addWellnessFromTip()'>📌 收藏</button>
      </div>
      <div class="card">
        <h3>📝 添加养生记录</h3>
        <div class="form-row">
          <input id="wl-title" placeholder="标题" style="flex:2">
          <select id="wl-tag">${WELLNESS_TAGS.map((g) => `<option value='${g}'>${g}</option>`).join('')}</select>
        </div>
        <div class="form-row">
          <input id="wl-url" placeholder="视频/文章链接（可选）">
          <input id="wl-note" placeholder="心得/用法">
        </div>
        <button class="btn" onclick="addWellness()">+ 添加</button>
      </div>
    </div>
    <div>
      <div class="card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          ${[['all','全部'],...WELLNESS_TAGS.map((g) => [g,g])].map(([k,n]) => `<button class='hot-tab ${tagFilter===k?'active':''}' onclick='wellnessTag="${k}";renderWellness()'>${n}</button>`).join('')}
        </div>
        ${filtered.length ? filtered.map((x) => `<div class="list-item">
          <span class="tag lo">${esc(x.tag)}</span>
          <div class="grow"><div class="title">${esc(x.title)}</div>${x.note?`<div class="sub">${esc(x.note)}</div>`:''}</div>
          ${x.url ? `<a class="btn sm ghost" href="${safeUrl(x.url)}" target="_blank" rel="noopener">打开</a>` : ''}
          <button class="icon-btn" onclick="delWellness('${x.id}')">✕</button>
        </div>`).join('') : '<div class="empty">暂无记录，先从左侧收藏今日推荐或添加一条</div>'}
        <div id="wellness-video-slot"></div>
      </div>
    </div>
  </div>`;
}
/* toggleInlineVideo 已移除：养生/学习记录中的视频链接改为普通外链跳转 */
function addWellnessFromTip() {
  const tip = __wellnessTip;
  D.wellness.push({id:uid(), date:todayStr(), tag:tip.tag, title:tip.title, url:tip.url, note:tip.note});
  completeQuest('wellness', '养生达人', '🍵');
  save(); renderWellness(); toast('已收藏今日养生推荐');
}
function addWellness() {
  const title = $('#wl-title').value.trim();
  const tag = $('#wl-tag').value;
  const url = $('#wl-url').value.trim();
  const note = $('#wl-note').value.trim();
  if (!title) return toast('请输入标题');
  D.wellness.push({id:uid(), date:todayStr(), tag, title, url, note});
  completeQuest('wellness', '养生达人', '🍵');
  save(); renderWellness(); toast('已添加');
}
function delWellness(id) { tombstone(id); D.wellness = D.wellness.filter(x=>x.id!==id); save(); renderWellness(); }

/* ================= 塔罗星盘 ================= */
function renderTarot() {
  ensureDailyQuests();
  const recent = (D.tarotDraws || []).slice().reverse();
  const todayDone = D.dailyQuests.tarot;
  const modeLabel = (TAROT_MODES.find((m) => m[0] === tarotMode) || ['daily','每日一牌'])[1];
  const modeDesc = {
    daily: '每日一牌：快速把握今天的能量（1张）',
    flow: '时间之流：过去 · 现在 · 未来（3张）',
    triangle: '关系三角：我 · 对方 · 关系（3张）',
    choice: '二择抉择：选项A · 选项B · 建议（3张）'
  }[tarotMode];
  const studyCard = TAROT_DECK[Math.floor(Date.now() / 86400000) % TAROT_DECK.length];
  $('#sec-tarot').innerHTML = `
  ${moduleHeaderHtml('tarot','塔罗星盘','每日占卜 · 牌意学习')}
  <div class="quest-task-card ${todayDone ? 'done' : ''}">
    <div class="qtc-check">${todayDone ? '✅' : '⭕'}</div>
    <div class="qtc-body">
      <div class="qtc-title">今日任务 (${todayDone ? '1/1' : '0/1'})</div>
      <div class="qtc-desc">完成每日占卜 & 学习一张牌意</div>
      <div class="qtc-from">来自 塔罗星盘</div>
    </div>
    <div class="qtc-reward">+1 ⭐</div>
  </div>
  <div class="tarot-tip">✨ 静心默念你的问题，再开始洗牌。占卜是照见内心的镜子，不是命运的判决书。</div>
  <div class="grid cols-2">
    <div>
      <div class="card tarot-board">
        <h3>🔮 每日占卜 · ${modeLabel}</h3>
        <div class="form-row">
          <input id="tarot-question" placeholder="输入你想问的问题（可留空）" style="flex:1">
        </div>
        <div class="hot-tabs dark">${TAROT_MODES.map(([k,n]) => `<button class="hot-tab ${tarotMode===k?'active':''}" onclick="tarotMode='${k}';renderTarot()">${n}</button>`).join('')}</div>
        <div class="tarot-mode-desc">${modeDesc}</div>
        <div class="tarot-stage" id="tarot-stage">
          <div class="tarot-deck" id="tarot-deck" onclick="drawTarot('${tarotMode}')"><div class="tarot-back">TAROT</div><div class="tarot-hint">点击洗牌抽牌</div></div>
        </div>
        <div id="tarot-result" style="min-height:120px"></div>
      </div>
      <div class="card"><h3>🎴 牌意学习</h3>
        <div class="study-card">
          <div class="sc-name">${esc(studyCard.cn)}</div>
          <div class="sc-keyword">${esc(studyCard.keyword)}</div>
          <div class="sc-mean">正位：${esc(studyCard.up)}</div>
          <div class="sc-mean">逆位：${esc(studyCard.rev)}</div>
          <button class="btn" onclick="learnTarotCard('${esc(studyCard.cn).replace(/'/g,"\\'")}')">✓ 学会了</button>
        </div>
      </div>
    </div>
    <div>
      <div class="card tarot-board">
        <h3>📜 抽牌记录</h3>
        ${recent.length ? recent.map((x) => `<div class="list-item">
          <span class="tag purple">${x.date.slice(5)}</span>
          <div class="grow"><div class="title">${esc(x.card)} ${x.upright ? '正位' : '逆位'}</div>${x.question ? `<div class="sub">问：${esc(x.question)}</div>` : ''}</div>
          <button class="icon-btn" onclick="deleteTarotDraw('${x.id}')">✕</button>
        </div>`).join('') : '<div class="empty">还没有抽牌记录</div>'}
      </div>
      <div class="card"><h3>🔗 相关资源</h3>
        <div class="hot-tabs">${TAROT_MODES.map(([k,n]) => `<button class="hot-tab" onclick="window.open('https://search.bilibili.com/all?keyword=${encodeURIComponent('塔罗' + n)}','_blank')">${n}教学</button>`).join('')}</div>
        <div class="empty">抽牌与牌意学习均在本地完成，相关教学视频可点上方按钮前往 B站 搜索。</div>
      </div>
    </div>
  </div>`;
}
function drawTarot(mode) {
  const deck = $('#tarot-deck');
  const result = $('#tarot-result');
  const q = $('#tarot-question') ? $('#tarot-question').value.trim() : '';
  if (!deck) return;
  deck.classList.add('shuffling');
  if (result) result.innerHTML = '<div class="empty">正在洗牌…</div>';
  setTimeout(() => {
    let cards = [], question = q || '今日运势';
    const count = mode === 'daily' ? 1 : 3;
    const pool = [...TAROT_DECK];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const card = pool.splice(idx, 1)[0];
      const upright = Math.random() > 0.5;
      cards.push({ ...card, upright });
    }
    cards.forEach((c) => {
      D.tarotDraws.push({ id: uid(), date: todayStr(), card: c.cn, upright: c.upright, question, interpretation: c.upright ? c.up : c.rev });
    });
    save();
    completeQuest('tarot', '今日塔罗', '⭐');
    if (deck) {
      deck.classList.remove('shuffling');
      if (count === 1) {
        deck.innerHTML = `<div class='tarot-face ${cards[0].upright ? '' : 'reversed'}'><div class='tarot-name'>${esc(cards[0].cn)}</div><div class='tarot-keyword'>${esc(cards[0].keyword)}</div></div>`;
      } else {
        deck.innerHTML = `<div class="tarot-multi">${cards.map((c) => `<div class="tarot-face mini ${c.upright ? '' : 'reversed'}"><div class="tarot-name">${esc(c.cn)}</div><div class="tarot-keyword">${c.upright ? '正' : '逆'}</div></div>`).join('')}</div>`;
      }
    }
    if (result) {
      result.innerHTML = cards.map((c, i) => {
        const labels = { daily: [''], flow: ['过去','现在','未来'], triangle: ['我','对方','关系'], choice: ['选项A','选项B','建议'] };
        const label = labels[mode] && labels[mode][i] ? `<span class="tarot-label">${labels[mode][i]}</span>` : '';
        return `<div class="tarot-result-card"><div class="trc-title">${label}${esc(c.cn)} ${c.upright ? '正位' : '逆位'}</div><div class="trc-keyword">${esc(c.keyword)}</div><div class="trc-desc">🤖 AI 解析：${esc(c.upright ? c.up : c.rev)}</div></div>`;
      }).join('');
    }
    toast(count === 1 ? '抽牌完成，已保存记录' : '牌阵展开，已保存记录');
  }, 1200);
}
function learnTarotCard(name) {
  completeQuest('tarot', '牌意学徒', '🃏');
  toast(`已学习 ${name}，获得贴纸 🃏 牌意学徒`);
}
function deleteTarotDraw(id) { tombstone(id); D.tarotDraws = D.tarotDraws.filter((x) => x.id !== id); save(); renderTarot(); }
/* refreshBiliVideos 已移除 */

/* ================= 道法学习 ================= */
function renderTao() {
  ensureDailyQuests();
  const recent = (D.taoDivinations || []).slice().reverse();
  const methodName = (TAO_METHODS.find((m) => m[0] === taoMethod) || ['liuren','小六壬'])[1];
  const todayDone = D.dailyQuests.tao;
  const quickRef = taoMethod === 'liuren' ? LIUREN.map((r) => `<div class="liuren-item"><span class="lr-name">${esc(r.name)}</span><span class="lr-mean">${esc(r.meaning)}</span></div>`).join('') : HEXAGRAMS.slice(0, 8).map((h) => `<div class="liuren-item"><span class="lr-name">${esc(h.name)}</span><span class="lr-mean">${esc(h.meaning)}</span></div>`).join('');
  $('#sec-tao').innerHTML = `
  ${moduleHeaderHtml('tao','道法学习','小六壬 · 六爻 · 梅花易数 · 五行八卦')}
  <div class="quest-task-card ${todayDone ? 'done' : ''}">
    <div class="qtc-check">${todayDone ? '✅' : '⭕'}</div>
    <div class="qtc-body">
      <div class="qtc-title">今日任务 (${todayDone ? '1/1' : '0/1'})</div>
      <div class="qtc-desc">道法学习：起一卦并记录心得</div>
      <div class="qtc-from">来自 道法学习</div>
    </div>
    <div class="qtc-reward">+1 ⭐</div>
  </div>
  <div class="tarot-tip">💡 起卦讲究"心诚则灵，不疑不占、一事一占"。以下解卦由本地规则引擎生成，用于学习传统文化，请理性看待。</div>
  <div class="grid cols-2">
    <div>
      <div class="card tao-board">
        <h3>☯️ 道法学习 · ${methodName}</h3>
        <div class="hot-tabs dark">${TAO_METHODS.map(([k,n]) => `<button class="hot-tab ${taoMethod===k?'active':''}" onclick="taoMethod='${k}';renderTao()">${n}</button>`).join('')}</div>
        <div class="tao-method-desc">${taoMethod === 'liuren' ? '传统以「月—日—时」三宫连推。可用当下时间自动起课，或自报三数。' : '心中默念所问之事，点击下方铜钱起卦。'}</div>
        ${taoMethod === 'liuren' ? `
        <div class="liuren-panel">
          <h4>🖐️ 小六壬 · 掐指起课</h4>
          <div class="liuren-desc">传统以「月—日—时」三宫连推。可用当下时间自动起课，或自报三数。</div>
          <div class="liuren-actions">
            <button class="btn secondary" onclick="castLiurenByTime()">⏱️ 按当前时辰起课</button>
            <button class="btn secondary" onclick="castLiurenByNumber()">🔢 报数起课</button>
          </div>
          <div id="liuren-result"></div>
        </div>` : ''}
        <div class="coin-stage" id="coin-stage">
          <div class="coin-row" onclick="castTao()">
            <div class="tao-coin">道</div><div class="tao-coin">法</div><div class="tao-coin">自</div><div class="tao-coin">然</div>
          </div>
          <div class="coin-hint">点击下方铜钱起卦</div>
        </div>
        <div id="tao-result" style="min-height:100px"></div>
      </div>
      <div class="card tao-board">
        <h3>✋ ${methodName} · 速查</h3>
        <div class="liuren-grid">${quickRef}</div>
      </div>
    </div>
    <div>
      <div class="card tao-board">
        <h3>📚 学习资源</h3>
        <div class="hot-tabs">${TAO_METHODS.map(([k,n]) => `<button class="hot-tab" onclick="window.open('https://search.bilibili.com/all?keyword=${encodeURIComponent(n)}','_blank')">${n}视频</button>`).join('')}</div>
      </div>
      <div class="card tao-board">
        <h3>📝 占卦记录</h3>
        ${recent.length ? recent.map((x) => `<div class="list-item">
          <span class="tag teal">${x.date.slice(5)}</span>
          <div class="grow"><div class="title">${esc(x.method)} · ${esc(x.result)}</div>${x.question ? `<div class="sub">${esc(x.question)}</div>` : ''}</div>
          <button class="icon-btn" onclick="deleteTaoDiv('${x.id}')">✕</button>
        </div>`).join('') : '<div class="empty">还没有占卦记录</div>'}
      </div>
    </div>
  </div>`;
}
function castTao() {
  const stage = $('#coin-stage');
  const resultBox = $('#tao-result');
  if (stage) stage.classList.add('casting');
  if (resultBox) resultBox.innerHTML = '<div class="empty">铜钱起舞，正在起卦…</div>';
  setTimeout(() => {
    if (stage) stage.classList.remove('casting');
    let record;
    if (taoMethod === 'liuren') {
      const r = LIUREN[Math.floor(Math.random() * LIUREN.length)];
      record = { id: uid(), date: todayStr(), method: '小六壬', result: r.name, question: '今日运势', interpretation: r.meaning };
    } else {
      const h = HEXAGRAMS[Math.floor(Math.random() * HEXAGRAMS.length)];
      record = { id: uid(), date: todayStr(), method: (TAO_METHODS.find((m) => m[0] === taoMethod) || ['', ''])[1], result: h.name, question: '今日运势', interpretation: h.meaning };
    }
    D.taoDivinations.push(record);
    save();
    completeQuest('tao', '今日道法', '☯️');
    if (resultBox) {
      resultBox.innerHTML = `
        <div class="tao-result-card">
          <div class="trc-title">${esc(record.result)}</div>
          <div class="trc-desc">🤖 AI 解卦：${esc(record.interpretation)}</div>
          <div style="margin-top:10px"><input id="tao-note" placeholder="记录心得（可选）" style="flex:1"><button class="btn" onclick="saveTaoNote('${record.id}')">保存心得</button></div>
        </div>`;
    }
    toast('起卦完成，已保存记录');
  }, 1500);
}
function saveTaoNote(id) {
  const note = $('#tao-note') ? $('#tao-note').value.trim() : '';
  const rec = D.taoDivinations.find((x) => x.id === id);
  if (rec && note) { rec.note = note; save(); toast('心得已记录'); }
}
function deleteTaoDiv(id) { tombstone(id); D.taoDivinations = D.taoDivinations.filter((x) => x.id !== id); save(); renderTao(); }

function getEarthlyHour(date) {
  if (!date) date = new Date();
  const h = date.getHours();
  // 23-1 子(1), 1-3 丑(2), ... 21-23 亥(12)
  return [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12][h] || 1;
}
function liurenStep(startIdx, count) {
  // 从 startIdx 顺数 count 步（含起点为第 1 步）
  return (startIdx + (count - 1)) % 6;
}
function castLiurenByTime() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = getEarthlyHour(now);
  const monthIdx = liurenStep(0, month);
  const dayIdx = liurenStep(monthIdx, day);
  const hourIdx = liurenStep(dayIdx, hour);
  showLiurenResult(month, day, hour, [LIUREN[monthIdx], LIUREN[dayIdx], LIUREN[hourIdx]], '时辰起课', '今日运势');
}
function castLiurenByNumber() {
  appPrompt('报数起课：输入三个正整数（用空格或逗号隔开），分别代表月数、日数、时数。', (raw) => {
    if (!raw) return;
    const nums = raw.split(/[，,\s]+/).map(Number).filter(n => n > 0 && !isNaN(n));
    if (nums.length < 3) { toast('请输入三个正整数'); return; }
    const [month, day, hour] = nums.slice(0, 3);
    const monthIdx = liurenStep(0, month);
    const dayIdx = liurenStep(monthIdx, day);
    const hourIdx = liurenStep(dayIdx, hour);
    showLiurenResult(month, day, hour, [LIUREN[monthIdx], LIUREN[dayIdx], LIUREN[hourIdx]], '报数起课', '所问之事');
  });
}
function showLiurenResult(month, day, hour, positions, methodLabel, questionDefault) {
  const names = positions.map(p => p.name);
  const means = positions.map(p => p.meaning);
  const resultBox = $('#liuren-result');
  if (resultBox) {
    resultBox.innerHTML = `
      <div class="tao-result-card" style="margin-top:12px">
        <div class="trc-title">☯️ ${esc(methodLabel)} 三宫结果（${esc(month)} · ${esc(day)} · ${esc(hour)}）</div>
        <div class="trc-desc">
          <div class="liuren-result-grid">
            <div><span class="lr-tag">月宫</span><b>${esc(names[0])}</b><span>${esc(means[0])}</span></div>
            <div><span class="lr-tag">日宫</span><b>${esc(names[1])}</b><span>${esc(means[1])}</span></div>
            <div><span class="lr-tag">时宫</span><b>${esc(names[2])}</b><span>${esc(means[2])}</span></div>
          </div>
        </div>
        <div class="liuren-save-row">
          <input id="tao-question" placeholder="所问之事（可选）">
          <input id="tao-note" placeholder="记录心得（可选）">
          <button class="btn" onclick="saveLiurenRecord(${month},${day},${hour},'${names.join(',')}','${esc(methodLabel)}','${esc(questionDefault)}')">保存到占卦记录</button>
        </div>
      </div>`;
  }
}
function saveLiurenRecord(month, day, hour, namesStr, methodLabel, questionDefault) {
  const questionInput = $('#tao-question');
  const noteInput = $('#tao-note');
  const question = questionInput && questionInput.value.trim() ? questionInput.value.trim() : questionDefault;
  const note = noteInput ? noteInput.value.trim() : '';
  const names = namesStr.split(',');
  const interpretation = names.map(n => {
    const r = LIUREN.find(x => x.name === n);
    return `${n}：${r ? r.meaning : ''}`;
  }).join('；');
  const record = {
    id: uid(),
    date: todayStr(),
    method: `小六壬 · ${methodLabel}`,
    result: names.join(' → '),
    question: `${question}（月${month} 日${day} 时${hour}）`,
    interpretation,
    note
  };
  D.taoDivinations.push(record);
  save();
  completeQuest('tao', '今日道法', '☯️');
  renderTao();
  toast('已保存到占卦记录');
}

/* ================= 学习打卡 ================= */
const STUDY_TRACKS = {
  logic: {
    name: '逻辑思维训练',
    icon: '🧩',
    color: 'var(--primary)',
    desc: '每日 6 点刷新：推理、批判性思维、逻辑谜题与教学视频。',
    tasks: ['阅读一篇逻辑谬误案例并总结', '完成 5 道逻辑推理题', '观看一个思维模型视频', '用金字塔原理拆解一个问题', '复盘今天的一个决策，找出假设与结论']
  },
  finance: {
    name: '理财基金金融学习',
    icon: '📈',
    color: 'var(--orange)',
    desc: '零基础教程：基金、股票、资产配置、复利与风险管理。',
    tasks: ['学习一个基金术语（如 PE、夏普比率）', '看一期理财科普短视频', '记录一笔消费并分类', '复盘本月支出预算', '阅读一篇宏观经济简报']
  }
};
function calcStreak() {
  const dates = new Set(D.study.map((x) => x.date));
  let streak = 0;
  const d = new Date();
  if (!dates.has(todayStr())) d.setDate(d.getDate() - 1);
  while (true) {
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (dates.has(ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return streak;
}
function renderStudy() {
  const t = todayStr();
  const todayList = D.study.filter((x) => x.date === t);
  const totalMin = D.study.reduce((a, b) => a + b.minutes, 0);
  const days = new Set(D.study.map((x) => x.date)).size;
  const minByDate = {};
  D.study.forEach((x) => minByDate[x.date] = (minByDate[x.date] || 0) + x.minutes);
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const on = !!minByDate[ds];
    cells.push(`<div class="streak-cell ${on ? "on" : ""}" title="${ds}${on ? " · " + minByDate[ds] + "分钟" : ""}"><span>${d.getDate()}</span></div>`);
  }
  const recent = [...D.study].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  $("#sec-study").innerHTML = `
  <div class="grid cols-3" style="margin-bottom:16px">
    <div class="card stat"><div class="v" style="color:var(--green)">${calcStreak()} 天</div><div class="l">连续打卡</div></div>
    <div class="card stat"><div class="v" style="color:var(--primary)">${days} 天</div><div class="l">累计学习天数</div></div>
    <div class="card stat"><div class="v" style="color:var(--purple)">${(totalMin / 60).toFixed(1)} h</div><div class="l">累计学习时长</div></div>
  </div>
  <div class="grid cols-2">
    <div>
      <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,#eef1fe,#fff);border-left:4px solid var(--primary)">
        <h3>🎯 学习专题</h3>
        ${Object.entries(STUDY_TRACKS).map(([k, tr]) => {
          const dayIdx = Math.floor(Date.now() / 86400000) % tr.tasks.length;
          const todayTask = tr.tasks[dayIdx];
          const doneToday = D.study.some(s => s.date === t && s.category === k);
          return `<div style="margin-bottom:14px;padding:12px;background:#fff;border-radius:12px;border:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:20px">${tr.icon}</span>
              <b style="color:${tr.color}">${tr.name}</b>
              ${doneToday ? '<span class="tag lo">今日已打卡</span>' : ''}
              ${D.dailyQuests && D.dailyQuests[k] ? '<span class="tag lo">今日任务完成</span>' : ''}
            </div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:8px">${tr.desc}</div>
            <div style="font-size:13px;margin-bottom:10px">📌 今日任务：${esc(todayTask)}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn sm" style="background:${tr.color};color:#fff" onclick="quickStudyTrack('${k}', '${esc(todayTask).replace(/'/g, "\\'")}')">✓ 打卡 ${tr.name}</button>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="card" style="margin-bottom:16px">
        <h3>✏️ 今日打卡</h3>
        <div class="form-row">
          <input id="st-subject" placeholder="学了什么？如：英语 / 算法" style="flex:2">
          <select id="st-category">
            <option value="">常规</option>
            ${Object.entries(STUDY_TRACKS).map(([k, tr]) => `<option value="${k}">${tr.name}</option>`).join('')}
          </select>
          <input id="st-min" type="number" placeholder="分钟" min="1">
        </div>
        <div class="form-row">
          <input id="st-url" placeholder="视频链接（可选，保存后跳转）" style="flex:1">
        </div>
        <div class="form-row">
          <input id="st-note" placeholder="学习心得(可选)">
          <button class="btn" onclick="addStudy()">✓ 打卡</button>
        </div>
        ${todayList.length ? `<div style="font-size:13px;color:var(--green);font-weight:600">✅ 今天已打卡 ${todayList.length} 次，共 ${todayList.reduce((a, b) => a + b.minutes, 0)} 分钟</div>` : '<div style="font-size:13px;color:var(--orange)">今天还没打卡哦</div>'}
      </div>
      <div class="card" style="margin-bottom:16px"><h3>🗓 近30天打卡</h3><div class="streak-grid">${cells.join("")}</div></div>
      <div class="card"><h3>🌱 全年学习热力图</h3>${studyHeatmapHtml(minByDate)}</div>
    </div>
    <div class="card"><h3>📖 学习记录</h3>
      ${recent.length ? recent.map((x) => `<div class="list-item">
        <span class="tag purple">${x.date.slice(5)}</span>
        <div class="grow"><div class="title">${esc(x.subject)}</div>${x.note ? `<div class="sub">${esc(x.note)}</div>` : ""}</div>
        <span class="tag teal">${x.minutes}min</span>
        ${x.url ? `<a class="btn sm ghost" href="${safeUrl(x.url)}" target="_blank" rel="noopener">打开</a>` : ''}
        <button class="icon-btn" onclick="delStudy('${x.id}')">✕</button></div>`).join("") : '<div class="empty">暂无学习记录</div>'}
      </div>
    </div>
  </div>`;
}
function studyHeatmapHtml(minByDate) {
  const weeks = 26;
  const today = new Date();
  const end = new Date(today); end.setDate(end.getDate() + (6 - end.getDay()));
  const start = new Date(end); start.setDate(start.getDate() - weeks * 7 + 1);
  const level = (m) => !m ? 0 : m < 30 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4;
  const cols = [];
  const cur2 = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const ds = `${cur2.getFullYear()}-${pad(cur2.getMonth() + 1)}-${pad(cur2.getDate())}`;
      const future = cur2 > today;
      const m = minByDate[ds] || 0;
      cells.push(`<div class="hm-cell lv${future ? "x" : level(m)}" title="${ds}${m ? " · " + m + "分钟" : future ? "" : " · 未打卡"}"></div>`);
      cur2.setDate(cur2.getDate() + 1);
    }
    cols.push(`<div class="hm-col">${cells.join("")}</div>`);
  }
  return `<div class="hm-wrap">${cols.join("")}</div>
  <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text2);margin-top:8px">少 <div class="hm-cell lv0"></div><div class="hm-cell lv1"></div><div class="hm-cell lv2"></div><div class="hm-cell lv3"></div><div class="hm-cell lv4"></div> 多（近${weeks}周 · 按分钟分级）</div>`;
}
/* refreshStudyVideo 已移除 */
function addStudy(subject, minutes, note, category, url) {
  const s = subject || $("#st-subject").value.trim();
  const m = minutes != null ? +minutes : parseInt($("#st-min").value);
  const c = category || ($("#st-category") ? $("#st-category").value : "");
  const n = note != null ? note : ($("#st-note") ? $("#st-note").value.trim() : "");
  const u = url != null ? url : ($("#st-url") ? $("#st-url").value.trim() : "");
  if (!s) return toast("请输入学习内容");
  if (!m || m <= 0) return toast("请输入学习分钟数");
  D.study.push({ id: uid(), date: todayStr(), subject: s, minutes: m, note: n, category: c, url: u });
  if (c === 'logic') completeQuest('logic', '逻辑达人', '🧩');
  if (c === 'finance') completeQuest('finance', '理财新手', '📈');
  save(); renderStudy(); toast("打卡成功，继续加油 💪");
}
function quickStudyTrack(track, task) {
  const u = $("#st-url") ? $("#st-url").value.trim() : "";
  addStudy(task, 20, STUDY_TRACKS[track].name + " 专题打卡", track, u);
}
function delStudy(id) { tombstone(id); D.study = D.study.filter((x) => x.id !== id); save(); renderStudy(); }

/* ================= 每日/月计划 ================= */
let planDate = todayStr();
let planMonth = monthStr();
function renderPlan() {
  $("#sec-plan").innerHTML = `
  <div class="grid cols-2">
    <div class="card">
      <h3>📝 每日计划 <input type="date" value="${planDate}" style="width:auto;font-size:12px;padding:5px 8px" onchange="planDate=this.value;renderPlan()"></h3>
      <textarea id="plan-daily" rows="12" placeholder="写下 ${planDate} 的计划，比如：&#10;- 上午：完成方案初稿&#10;- 下午：健身腿部训练&#10;- 晚上：背单词30分钟">${esc(D.plans.daily[planDate] || "")}</textarea>
      <button class="btn" style="margin-top:10px" onclick="savePlan('daily')">保存每日计划</button>
      <button class="btn ghost sm" style="margin-top:10px" onclick="go('tools');openTool('pomodoro')">🍅 打开番茄钟</button>
    </div>
    <div class="card">
      <h3>🗓 月度计划 <input type="month" value="${planMonth}" style="width:auto;font-size:12px;padding:5px 8px" onchange="planMonth=this.value;renderPlan()"></h3>
      <textarea id="plan-monthly" rows="12" placeholder="写下 ${planMonth} 的月度目标，比如：&#10;1. 体重降到 70kg&#10;2. 读完 2 本书&#10;3. 存款 +5000">${esc(D.plans.monthly[planMonth] || "")}</textarea>
      <button class="btn" style="margin-top:10px" onclick="savePlan('monthly')">保存月度计划</button>
    </div>
  </div>`;
}
function savePlan(type) {
  if (type === "daily") D.plans.daily[planDate] = $("#plan-daily").value;
  else D.plans.monthly[planMonth] = $("#plan-monthly").value;
  save(); toast("计划已保存");
}

/* ================= 身体变化（体重 + 围度） ================= */
function renderWeight() {
  const list = [...D.weights].sort((a, b) => a.date.localeCompare(b.date));
  const last = list.at(-1);
  const first = list[0];
  const h = parseFloat(D.settings.height);
  const bmi = last && h ? (last.kg / ((h / 100) ** 2)).toFixed(1) : null;
  const bmiText = bmi ? (bmi < 18.5 ? "偏瘦" : bmi < 24 ? "正常" : bmi < 28 ? "超重" : "肥胖") : "";
  $("#sec-weight").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <div class="form-row">
      <input id="wt-kg" type="number" step="0.1" placeholder="今日体重(kg)">
      <input id="wt-date" type="date" value="${todayStr()}">
      <button class="btn" onclick="addWeight()">+ 记录</button>
    </div>
  </div>
  <div class="grid cols-3" style="margin-bottom:16px">
    <div class="card stat"><div class="v">${last ? last.kg + " kg" : "--"}</div><div class="l">最新体重${last ? "（" + last.date + "）" : ""}</div></div>
    <div class="card stat"><div class="v" style="color:${last && first && last.kg <= first.kg ? "var(--green)" : "var(--red)"}">${last && first ? (last.kg - first.kg > 0 ? "+" : "") + r1(last.kg - first.kg) + " kg" : "--"}</div><div class="l">累计变化</div></div>
    <div class="card stat"><div class="v">${bmi || "--"} ${bmiText ? `<span style="font-size:12px;font-weight:400">${bmiText}</span>` : ""}</div><div class="l">BMI${h ? "" : "（设置里填身高后显示）"}</div></div>
  </div>
  <div class="grid cols-2">
    <div class="card"><h3>📉 体重曲线</h3>${weightChartSvg(list)}</div>
    <div class="card"><h3>📋 记录明细</h3>
      ${list.length ? [...list].reverse().slice(0, 30).map((x, i, arr) => {
        const prev = arr[i + 1];
        const diff = prev ? r1(x.kg - prev.kg) : 0;
        return `<div class="list-item"><span class="tag blue">${x.date.slice(5)}</span>
          <div class="grow"><b>${x.kg} kg</b></div>
          ${prev ? `<span style="font-size:12px;color:${diff <= 0 ? "var(--green)" : "var(--red)"}">${diff > 0 ? "+" : ""}${diff}</span>` : ""}
          <button class="icon-btn" onclick="delWeight('${x.id}')">✕</button></div>`;
      }).join("") : '<div class="empty">暂无身体变化记录</div>'}
    </div>
  </div>
  <div class="card" style="margin-top:16px"><h3>🍽️ 摄入热量 × 体重 联动（近30天）</h3>${kcalWeightChartSvg()}</div>
  ${measurementSectionHtml()}`;
}
function kcalWeightChartSvg() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const kcal = D.meals.filter((x) => x.date === ds).reduce((a, b) => a + (b.kcal || 0), 0);
    const w = D.weights.find((x) => x.date === ds);
    days.push({ ds, kcal, kg: w ? w.kg : null });
  }
  if (!days.some((x) => x.kcal) && !days.some((x) => x.kg != null)) return '<div class="empty">记录饮食和体重后，这里会展示两者的关联趋势</div>';
  const W = 680, H = 200, PL = 40, PR = 44, PT = 14, PB = 24;
  const maxK = Math.max(...days.map((x) => x.kcal), D.settings.kcalTarget || 2000, 1);
  const kgs = days.filter((x) => x.kg != null).map((x) => x.kg);
  const minW = kgs.length ? Math.min(...kgs) - 0.5 : 0, maxW = kgs.length ? Math.max(...kgs) + 0.5 : 1;
  const X = (i) => PL + (i / 29) * (W - PL - PR);
  const YK = (v) => PT + (1 - v / maxK) * (H - PT - PB);
  const YW = (v) => PT + (1 - (v - minW) / (maxW - minW || 1)) * (H - PT - PB);
  const target = D.settings.kcalTarget || 2000;
  const wPts = days.map((x, i) => x.kg != null ? `${X(i)},${YW(x.kg)}` : null).filter(Boolean).join(" ");
  return `<div class="chart-wrap"><svg width="100%" viewBox="0 0 ${W} ${H}" style="min-width:320px">
    <line x1="${PL}" y1="${YK(target)}" x2="${W - PR}" y2="${YK(target)}" stroke="var(--orange)" stroke-dasharray="4 3" stroke-width="1"/>
    <text x="${PL + 2}" y="${YK(target) - 3}" font-size="9" fill="var(--orange)">热量目标 ${target}kcal</text>
    ${days.map((x, i) => x.kcal ? `<rect x="${X(i) - 4}" y="${YK(x.kcal)}" width="8" height="${Math.max(1, H - PB - YK(x.kcal))}" rx="1.5" fill="${x.kcal > target ? "var(--red)" : "var(--teal)"}" opacity="0.7"><title>${x.ds} 摄入 ${Math.round(x.kcal)}kcal</title></rect>` : "").join("")}
    ${wPts ? `<polyline points="${wPts}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    ${days.map((x, i) => x.kg != null ? `<circle cx="${X(i)}" cy="${YW(x.kg)}" r="3" fill="var(--card)" stroke="var(--primary)" stroke-width="2"><title>${x.ds}: ${x.kg}kg</title></circle>` : "").join("")}
    ${days.map((x, i) => i % 6 === 0 || i === 29 ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="var(--text2)">${x.ds.slice(5)}</text>` : "").join("")}
    <text x="${W - 4}" y="${PT}" text-anchor="end" font-size="9" fill="var(--text2)">柱=摄入kcal（超标变红） 线=体重kg</text>
  </svg></div>`;
}
function weightChartSvg(list) {
  if (list.length < 2) return '<div class="empty">至少记录 2 次体重后显示曲线</div>';
  const data = list.slice(-30);
  const W = 340, H = 180, PL = 34, PR = 10, PT = 14, PB = 26;
  const tgt = parseFloat(D.settings.targetWeight);
  const vs = data.map((d) => d.kg);
  if (tgt) vs = vs.concat([tgt]);
  const min = Math.min(...vs) - 0.5, max = Math.max(...vs) + 0.5;
  const X = (i) => PL + (i / (data.length - 1)) * (W - PL - PR);
  const Y = (v) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
  const pts = data.map((d, i) => `${X(i)},${Y(d.kg)}`).join(" ");
  const area = `M${X(0)},${H - PB} L${pts.replace(/ /g, " L")} L${X(data.length - 1)},${H - PB} Z`;
  const labels = data.map((d, i) => (i % Math.ceil(data.length / 5) === 0 || i === data.length - 1) ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="#6b7280">${d.date.slice(5)}</text>` : "").join("");
  return `<div class="chart-wrap"><svg width="100%" viewBox="0 0 ${W} ${H}" style="min-width:300px">
    <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4f6ef7" stop-opacity=".25"/><stop offset="100%" stop-color="#4f6ef7" stop-opacity="0"/></linearGradient></defs>
    ${[min, (min + max) / 2, max].map((v) => `<line x1="${PL}" y1="${Y(v)}" x2="${W - PR}" y2="${Y(v)}" stroke="#e6e9f2"/><text x="${PL - 4}" y="${Y(v) + 3}" text-anchor="end" font-size="9" fill="#6b7280">${v.toFixed(1)}</text>`).join("")}
    ${tgt ? `<line x1="${PL}" y1="${Y(tgt)}" x2="${W - PR}" y2="${Y(tgt)}" stroke="#16a34a" stroke-width="1.2" stroke-dasharray="5 4"/><text x="${W - PR}" y="${Y(tgt) - 3}" text-anchor="end" font-size="9" fill="#16a34a">目标 ${tgt}kg</text>` : ""}
    <path d="${area}" fill="url(#wg)"/>
    <polyline points="${pts}" fill="none" stroke="#4f6ef7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${data.map((d, i) => `<circle cx="${X(i)}" cy="${Y(d.kg)}" r="3" fill="#fff" stroke="#4f6ef7" stroke-width="2"><title>${d.date}: ${d.kg}kg</title></circle>`).join("")}
    ${labels}</svg></div>`;
}
function addWeight() {
  const kg = parseFloat($("#wt-kg").value);
  const date = $("#wt-date").value || todayStr();
  if (!kg || kg <= 0) return toast("请输入体重");
  const exist = D.weights.find((x) => x.date === date);
  if (exist) exist.kg = kg; else D.weights.push({ id: uid(), date, kg });
  save(); renderWeight(); toast("体重已记录");
}
function delWeight(id) { tombstone(id); D.weights = D.weights.filter((x) => x.id !== id); save(); renderWeight(); }

/* ================= 设置 & 云同步 ================= */
function renderSettings() {
  const s = D.settings;
  $("#sec-settings").innerHTML = `
  <div class="grid cols-2">
    <div>
      <div class="card" style="margin-bottom:16px">
        <h3>☁️ 多端云同步（手机 ⇄ PC）<button class="more" onclick="showSetupGuide('sync')">📖 图文指引</button></h3>
        <div style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:12px">
          多台电脑和手机共用同一份数据：在每台设备输入<b>同一个同步码</b>并开启「自动同步」即可。之后任意一端修改都会<b>自动同步</b>到其他端，不用手动操作。
        </div>
        <div class="form-row">
          <input id="sync-code" placeholder="同步码" value="${esc(s.syncCode)}" readonly>
          <button class="btn ghost" onclick="copySyncCode()">复制</button>
          <button class="btn ghost" onclick="genSyncCode()">生成新码</button>
        </div>
        <div class="form-row">
          <button class="btn" onclick="syncPush()">⬆ 立即推送</button>
          <button class="btn ghost" onclick="syncPull()">⬇ 立即拉取</button>
          <label style="flex:none;display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text2)">
            <input type="checkbox" ${s.autoSync ? "checked" : ""} onchange="D.settings.autoSync=this.checked;save(true);renderSettings();if(this.checked&&D.settings.syncCode)syncPullSilent().catch(()=>{})" style="width:16px;height:16px">自动同步
          </label>
          <label style="flex:none;display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text2)">
            <input type="checkbox" ${s.encryptSync !== false ? "checked" : ""} onchange="D.settings.encryptSync=this.checked;save(true);renderSettings()" style="width:16px;height:16px">🔒 端到端加密
          </label>
        </div>
        <div style="font-size:12px;color:${cryptoReady() ? "var(--green)" : "var(--orange)"};margin-bottom:6px">
          ${cryptoReady() ? "🔒 已启用端到端加密：上传前用同步码在本地 AES 加密，云端只存密文（同步码即密钥，两端一致才能解密）。" : "⚠️ 当前环境不支持加密（多见于直接打开本地文件），请用在线版同步以获得加密保护。"}
        </div>
        <div style="font-size:12px;color:var(--orange)">⚠️ <b>同步码即解密密钥，一旦遗忘或丢失，云端加密数据将<b>永久无法恢复</b></b>。请复制保存到密码管理器；若需绝对安全，优先用下方「导出/导入」文件（完全离线）。</div>

        <div style="border-top:1px dashed var(--border);margin:14px 0 4px;padding-top:12px">
          <div style="font-size:13px;color:var(--text);font-weight:600;margin-bottom:8px">同步后端</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
            <button class="btn sm ${s.syncBackend!=='supabase'?'':'gray'}" onclick="setSyncBackend('textdb')">🆓 免费云 textdb</button>
            <button class="btn sm ${s.syncBackend==='supabase'?'':'gray'}" onclick="setSyncBackend('supabase')">⚡ Supabase 实时（更可靠）</button>
          </div>
          <div id="supabase-cfg" style="${s.syncBackend==='supabase'?'':'display:none'}">
            <label class="fl">Supabase 项目 URL</label>
            <input id="supabase-url" placeholder="https://xxxx.supabase.co" value="${esc(s.supabaseUrl)}" style="margin-bottom:6px">
            <label class="fl">Anon / Public Key</label>
            <input id="supabase-anon" type="password" placeholder="eyJhbGciOi..." value="${esc(s.supabaseAnon)}" style="margin-bottom:8px">
            <div style="font-size:12px;color:var(--text2);margin-bottom:8px">在 Supabase 新建项目 → SQL Editor 执行建表语句（点「📄 建表 SQL」复制）→ 粘贴 URL 与 anon key。数据仍<b>以同步码为密钥端到端加密</b>，Supabase 只存密文。</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" onclick="saveSupabaseCfg()">保存配置</button>
              <button class="btn ghost" onclick="testSupabase()">测试连接</button>
              <button class="btn ghost" onclick="migrateToSupabase()">🚀 推本地到 Supabase</button>
              <button class="btn ghost" onclick="showSupabaseSql()">📄 建表 SQL</button>
            </div>
            <div id="supabase-status" style="font-size:12px;color:var(--text2);margin-top:8px"></div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <h3>📦 数据备份</h3>
        <div style="font-size:12px;color:${s.lastBackup ? "var(--text2)" : "var(--orange)"};margin-bottom:10px">
          ${s.lastBackup ? "上次备份：" + new Date(s.lastBackup).toLocaleString("zh-CN") : "⚠️ 从未备份过——数据只存在浏览器里，清缓存即丢失，请定期导出"}
          · 超过 7 天未备份时顶部会自动提醒
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text2)">
            <input type="checkbox" ${s.autoBackup?"checked":""} onchange="D.settings.autoBackup=this.checked;save(true);renderSettings()" style="width:16px;height:16px"> 自动备份（每次保存滚动存快照，保留最近 7 份）
          </label>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn ghost" onclick="exportData()">⬇ 导出JSON备份</button>
          <button class="btn ghost" onclick="$('#import-file').click()">⬆ 导入备份</button>
          <button class="btn ghost" onclick="exportCsv('money')">📊 记账CSV</button>
          <button class="btn ghost" onclick="exportCsv('diet')">🥗 饮食CSV</button>
          <button class="btn ghost" onclick="exportLifeReport()">📄 月度生活报告</button>
          <button class="btn danger" onclick="clearAll()">清空全部数据</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn ghost" onclick="exportAllData()">📤 导出全部数据（覆盖式）</button>
          <button class="btn ghost" onclick="importAllData()">📥 导入全部数据（覆盖当前）</button>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-top:6px">⚠️ 覆盖式导入会替换当前所有数据。建议先用上方「导出 JSON 备份」留存快照。</div>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(this)">
        <div id="backup-list" style="margin-top:12px"></div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <h3>🎨 外观</h3>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:13px;color:var(--text2)">主题模式</span>
          <button class="btn sm ${s.themeMode==='fixed'&&s.theme!=='dark' ? '' : 'gray'}" onclick="setThemeMode('fixed','light')">☀️ 固定浅色</button>
          <button class="btn sm ${s.themeMode==='fixed'&&s.theme==='dark' ? '' : 'gray'}" onclick="setThemeMode('fixed','dark')">🌙 固定深色</button>
          <button class="btn sm ${s.themeMode==='auto' ? '' : 'gray'}" onclick="setThemeMode('auto')">🌗 跟随系统</button>
          <button class="btn sm ${s.themeMode==='contrast' ? '' : 'gray'}" onclick="setThemeMode('contrast')">🌓 高对比</button>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-top:6px">跟随系统：按系统深浅或时间段（19:00–07:00）自动切换；高对比为强化配色模式。</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap">
          <span style="font-size:13px;color:var(--text2)">主题色</span>
          ${["#4f6ef7","#7c4dff","#e91e63","#ff5722","#00bcd4","#4caf50","#ff9800","#009688"].map(c=>`<button onclick="D.settings.themeColor='${c}';save(true);applyTheme();renderSettings()" style="width:26px;height:26px;border-radius:50%;border:3px solid ${s.themeColor===c?'#333':'transparent'};background:${c};cursor:pointer"></button>`).join("")}
          <input type="color" value="${s.themeColor||'#4f6ef7'}" onchange="D.settings.themeColor=this.value;save(true);applyTheme();renderSettings()" style="width:36px;height:28px;border:none;padding:0;cursor:pointer">
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap">
          <span style="font-size:13px;color:var(--text2)">字号</span>
          <input type="range" min="13" max="20" value="${s.fontSize||16}" oninput="D.settings.fontSize=+this.value;applyTheme();$('#fs-v').textContent=this.value+'px'" style="width:130px">
          <span id="fs-v" style="font-size:13px;color:var(--text)">${(s.fontSize||16)+'px'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px">
          <span style="font-size:13px;color:var(--text2)">布局密度</span>
          <button class="btn sm ${s.density!=='compact'?'':'gray'}" onclick="D.settings.density='normal';save(true);applyTheme();renderSettings()">宽松</button>
          <button class="btn sm ${s.density==='compact'?'':'gray'}" onclick="D.settings.density='compact';save(true);applyTheme();renderSettings()">紧凑</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <h3>🔔 提醒中心</h3>
        <div style="font-size:12px;color:var(--text2);line-height:1.8;margin-bottom:10px">
          用浏览器通知统一提醒：待办到期、习惯未打卡、喝水、日程。需授予通知权限（点击「开启」后浏览器会询问）。
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <button class="btn sm ${s.remindersEnabled?'':'gray'}" onclick="toggleReminders()">${s.remindersEnabled?'🔔 提醒已开启':'🔕 开启提醒'}</button>
          <span style="font-size:13px;color:var(--text2)">喝水提醒</span>
          <select class="inp" style="width:auto" onchange="D.settings.waterReminderMin=+this.value;save(true);initReminders();renderSettings()">
            ${[0,30,45,60,90,120].map(m=>`<option value="${m}" ${s.waterReminderMin==m?'selected':''}>${m?m+' 分钟':'关闭'}</option>`).join("")}
          </select>
        </div>
        <div id="reminder-status" style="font-size:12px;color:var(--green);margin-top:8px"></div>
      </div>
      <div class="card">
        <h3>🗺️ 地图与定位（旅行附近推荐 / 路线地图）</h3>
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px">
          在旅行中<b>定位当前位置</b>、推荐<b>附近景点与美食</b>（按距离排序，避免跑太远），并在路线页显示真实地图。使用腾讯位置服务，Key 仅存本地浏览器。
        </div>
        <label class="fl">腾讯位置服务 Key</label>
        <input id="map-key" type="password" placeholder="在 lbs.qq.com 申请" value="${esc(s.mapKey)}" style="margin-bottom:8px" onfocus="autoGuide('map')">
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px">
          免费申请：<a href="https://lbs.qq.com/dev/console/key/manage" target="_blank" style="color:var(--primary)">lbs.qq.com → 申请 Key</a>，开启「JavaScriptAPI」「WebServiceAPI」「地点搜索」三项；并在 Key 设置把本站域名加入<b>域名白名单</b>防盗用。
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button class="btn" onclick="saveMapCfg()">保存地图配置</button>
          <button class="btn ghost" onclick="showSetupGuide('map')">📖 图文指引</button>
          ${s.mapKey ? '<span style="font-size:12px;color:var(--green)">✅ 已配置</span>' : ''}
        </div>
      </div>
      <div class="card">
        <h3>🤖 AI 接口（拍照识别菜品用）</h3>
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px">填写任意 OpenAI 兼容的多模态接口（如混元、通义、GPT-4o、GLM-4V 等），用于饮食拍照分析。密钥仅保存在你自己的浏览器本地。</div>
        <label class="fl">接口地址 Base URL</label>
        <input id="ai-base" placeholder="如 https://api.hunyuan.cloud.tencent.com/v1" value="${esc(s.aiBase)}" style="margin-bottom:8px" onfocus="autoGuide('ai')">
        <label class="fl">API Key</label>
        <input id="ai-key" type="password" placeholder="sk-..." value="${esc(s.aiKey)}" style="margin-bottom:8px">
        <label class="fl">模型名（需支持图片输入）</label>
        <input id="ai-model" placeholder="如 hunyuan-turbos-vision / gpt-4o-mini" value="${esc(s.aiModel)}" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button class="btn" onclick="saveAiCfg()">保存 AI 配置</button>
          <button class="btn ghost" onclick="showSetupGuide('ai')">📖 图文指引</button>
          ${s.aiKey ? '<span style="font-size:12px;color:var(--green)">✅ 已配置</span>' : ''}
        </div>
      </div>
    </div>
    <div class="card">
      <h3>🎯 个人目标</h3>
      <label class="fl">身高(cm) — 用于计算BMI</label>
      <input id="cfg-height" type="number" value="${esc(s.height)}" style="margin-bottom:8px">
      <label class="fl">目标体重(kg) — 体重曲线会显示目标线</label>
      <input id="cfg-target" type="number" step="0.1" value="${esc(s.targetWeight)}" style="margin-bottom:8px">
      <label class="fl">每日热量目标(kcal)</label>
      <input id="cfg-kcal" type="number" value="${s.kcalTarget}" style="margin-bottom:8px">
      <label class="fl">每日蛋白质目标(g) — 增肌常用 1.6~2.2g/kg体重</label>
      <input id="cfg-p" type="number" value="${s.pTarget}" style="margin-bottom:8px">
      <label class="fl">每日碳水目标(g)</label>
      <input id="cfg-c" type="number" value="${s.cTarget}" style="margin-bottom:8px">
      <label class="fl">每日脂肪目标(g)</label>
      <input id="cfg-f" type="number" value="${s.fTarget}" style="margin-bottom:10px">
      <button class="btn" onclick="saveTargets()">保存目标</button>
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:var(--text2);line-height:1.9">
        💡 <b>手机使用小技巧</b>：用手机浏览器打开本站 → 菜单「添加到主屏幕」，即可像 App 一样全屏使用。
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3>🗂️ 记账分类与月度预算</h3>
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px">管理支出 / 收入分类；为当月各分类设置预算，超出时记账页会高亮提醒。</div>
      <div style="font-size:13px;font-weight:600;margin:8px 0 4px">支出分类</div>
      <div id="cat-out-exp">${catChipsHtml("支出")}</div>
      <div style="font-size:13px;font-weight:600;margin:8px 0 4px">收入分类</div>
      <div id="cat-out-inc">${catChipsHtml("收入")}</div>
      <div class="form-row" style="margin-top:8px">
        <select id="cat-type"><option value="支出">支出</option><option value="收入">收入</option></select>
        <input id="cat-name" placeholder="新分类名，如 打车/副业">
        <button class="btn" onclick="addMoneyCat()">+ 添加分类</button>
      </div>
      <h3 style="margin-top:16px">📅 本月预算（${monthStr(new Date())}）</h3>
      <div id="budget-list">${budgetListHtml()}</div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3>🔁 周期账单（自动入账）</h3>
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px">设置后每次打开工作台会自动补记到今天（如房租 / 订阅 / 工资）。</div>
      <div class="form-row">
        <select id="rb-type"><option value="支出">支出</option><option value="收入">收入</option></select>
        <input id="rb-cat" placeholder="分类，如 房租/工资" style="flex:2">
        <input id="rb-amt" type="number" step="0.01" placeholder="金额" style="flex:1">
      </div>
      <div class="form-row">
        <select id="rb-cycle"><option value="day">每天</option><option value="week">每周</option><option value="month">每月</option><option value="year">每年</option></select>
        <input id="rb-anchor" type="date" title="起始日（用于推算周期）">
        <input id="rb-note" placeholder="备注(可选)" style="flex:2">
        <button class="btn" onclick="addRecurringBill()">+ 添加</button>
      </div>
      <div id="rb-list" style="margin-top:10px">${recurringListHtml()}</div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3>🔐 保险箱安全</h3>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        <span style="font-size:13px;color:var(--text2)">闲置自动锁定</span>
        <select class="inp" style="width:auto" onchange="D.settings.vaultAutoLock=+this.value;save(true);renderSettings()">
          ${[0,1,5,15,30,60].map((m) => `<option value="${m}" ${ (D.settings.vaultAutoLock || 0) == m ? "selected" : "" }>${m ? m + " 分钟" : "关闭"}</option>`).join("")}
        </select>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn sm ${ (vaultBioAvailable() && D.vault.bioId) ? "" : "gray" }" onclick="vaultUnlockBio()">🔓 指纹解锁</button>
        <button class="btn sm ${ (function(){ try { return vaultBioAvailable() && vaultUnlocked(); } catch(e){ return false; } })() ? "" : "gray" }" onclick="vaultRegisterBio()">🧬 绑定生物识别</button>
        ${D.vault.bioId ? '<span style="font-size:12px;color:var(--green)">✅ 已绑定</span>' : '<span style="font-size:12px;color:var(--text2)">未绑定</span>'}
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px">${vaultBioAvailable() ? "支持设备指纹 / 面容解锁（WebAuthn）。绑定后指纹即等同于主密码，请勿在他人设备绑定。" : "当前浏览器不支持 WebAuthn，可用主密码解锁。"}</div>
    </div>

    <div class="card">
      <h3>🧠 AI 记忆（连续洞察）</h3>
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px">工作台会记住你近期的晨间简报与目标拆解，AI 复盘 / 规划时调用，让建议更连贯。仅存本地。</div>
      <div id="ai-mem-list" style="max-height:220px;overflow:auto">${aiMemoryListHtml()}</div>
      ${ (D.aiMemory || []).length ? '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn ghost sm" onclick="clearAiMemory()">🗑️ 清空记忆</button></div>' : "" }
    </div>
  </div>`;
  renderBackupList();
}
function saveTargets() {
  const s = D.settings;
  s.height = $("#cfg-height").value;
  s.targetWeight = $("#cfg-target").value.trim();
  s.kcalTarget = parseFloat($("#cfg-kcal").value) || 2000;
  s.pTarget = parseFloat($("#cfg-p").value) || 120;
  s.cTarget = parseFloat($("#cfg-c").value) || 220;
  s.fTarget = parseFloat($("#cfg-f").value) || 60;
  save(); toast("目标已保存");
}

/* ===== 记账分类 / 月度预算 ===== */
function catChipsHtml(type) {
  const cats = (MONEY_CATS[type] || []);
  if (!cats.length) return '<span style="font-size:12px;color:var(--text2)">暂无分类</span>';
  return cats.map((c) => `<span style="display:inline-flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:4px 10px;font-size:13px;margin:3px">${esc(c)}<button class="icon-btn" style="font-size:11px;padding:0 2px" onclick="delMoneyCat('${type}','${esc(c)}')">✕</button></span>`).join(" ");
}
function addMoneyCat() {
  const type = $("#cat-type").value;
  const name = $("#cat-name").value.trim();
  if (!name) return toast("请输入分类名");
  if (!MONEY_CATS[type]) MONEY_CATS[type] = [];
  if (MONEY_CATS[type].includes(name)) return toast("分类已存在");
  MONEY_CATS[type].push(name);
  syncMoneyCats(); renderSettings(); toast("已添加分类");
}
function delMoneyCat(type, name) {
  MONEY_CATS[type] = (MONEY_CATS[type] || []).filter((x) => x !== name);
  syncMoneyCats(); renderSettings();
}
function budgetListHtml() {
  const ms = monthStr(new Date());
  const budgets = (D.settings.catBudgets && D.settings.catBudgets[ms]) || {};
  const expCats = MONEY_CATS["支出"] || [];
  if (!expCats.length) return '<div class="empty">先添加支出分类</div>';
  return expCats.map((c) => {
    const b = budgets[c] || "";
    const spent = D.money.filter((x) => x.type === "支出" && x.cat === c && x.date && x.date.startsWith(ms)).reduce((a, x) => a + x.amount, 0);
    const over = b && spent > b;
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="flex:1;font-size:13px">${esc(c)} ${b ? `· 已花 ${fmtMoney(spent)}/${fmtMoney(b)}` : ""}</span>
      <input type="number" id="bd-${esc(c)}" value="${b}" placeholder="预算" style="width:90px" onchange="setCatBudget('${esc(c)}',this.value)">
      ${over ? '<span style="color:var(--red);font-size:12px">超支</span>' : ""}
    </div>`;
  }).join("");
}
function setCatBudget(cat, val) {
  const ms = monthStr(new Date());
  D.settings.catBudgets = D.settings.catBudgets || {};
  D.settings.catBudgets[ms] = D.settings.catBudgets[ms] || {};
  const v = parseFloat(val);
  if (isNaN(v) || v <= 0) delete D.settings.catBudgets[ms][cat];
  else D.settings.catBudgets[ms][cat] = v;
  save(true); renderSettings();
}

/* ===== 周期账单 ===== */
function cycleName(c) { return { day: "每天", week: "每周", month: "每月", year: "每年" }[c] || c; }
function recurringListHtml() {
  const list = D.recurringBills || [];
  if (!list.length) return '<div class="empty">还没有周期账单</div>';
  return list.map((b) => {
    const anchorDay = b.anchor ? new Date(b.anchor + "T00:00:00").getDate() : 0;
    const nxt = nextOcc(b.lastRun || b.anchor || todayStr(), b.cycle, anchorDay);
    return `<div class="list-item">
      <div class="grow"><div class="title">${esc(b.cat)} · ${fmtMoney(b.amount)}</div>
      <div class="sub">${cycleName(b.cycle)} · 上次入账 ${b.lastRun || "未"} · 下次 ${nxt}</div></div>
      <button class="icon-btn" onclick="delRecurringBill('${b.id}')">✕</button></div>`;
  }).join("");
}
function addRecurringBill() {
  const cat = $("#rb-cat").value.trim();
  const amount = parseFloat($("#rb-amt").value);
  const cycle = $("#rb-cycle").value;
  const type = $("#rb-type").value;
  const anchor = $("#rb-anchor").value;
  if (!cat || isNaN(amount) || !anchor) return toast("请填写分类、金额与起始日");
  D.recurringBills = D.recurringBills || [];
  D.recurringBills.push({ id: uid(), type, cat, amount, cycle, anchor, note: $("#rb-note").value.trim(), lastRun: "" });
  save(); renderSettings(); processRecurringBills(); renderMoney(); toast("已添加，将自动补记");
}
function delRecurringBill(id) { D.recurringBills = (D.recurringBills || []).filter((x) => x.id !== id); save(); renderSettings(); }

/* ===== AI 记忆 ===== */
function aiMemoryListHtml() {
  const m = D.aiMemory || [];
  if (!m.length) return '<div class="empty">还没有 AI 记忆</div>';
  return m.slice().reverse().map((x) => `<div class="list-item" style="align-items:flex-start">
    <div class="grow"><div class="title" style="font-size:13px">${esc((x.kind || "note") + " · " + new Date(x.ts).toLocaleString("zh-CN"))}</div>
    <div class="sub" style="white-space:pre-wrap">${esc(x.text)}</div></div></div>`).join("");
}
function clearAiMemory() { D.aiMemory = []; save(); renderSettings(); toast("已清空 AI 记忆"); }

function saveAiCfg() {
  D.settings.aiBase = $("#ai-base").value.trim();
  D.settings.aiKey = $("#ai-key").value.trim();
  D.settings.aiModel = $("#ai-model").value.trim();
  save(true); toast("AI 配置已保存（仅存本地浏览器）");
  if (D.settings.aiKey && !D.settings.seenGuides.ai) autoGuide("ai");
}
function saveMapCfg() {
  D.settings.mapKey = $("#map-key").value.trim();
  save(true); toast("地图配置已保存（仅存本地浏览器）"); renderSettings();
  if (D.settings.mapKey && !D.settings.seenGuides.map) autoGuide("map");
}

/* ===== 图文配置指引（地图 / AI 外部接入） ===== */
function guideStep(n, ico, html) {
  return `<div class="guide-step"><span class="n">${n}</span><span class="ico">${ico}</span><div class="body">${html}</div></div>`;
}
function showSetupGuide(type) {
  const m = type === "map" ? guideMap() : type === "ai" ? guideAi() : type === "sync" ? guideSync() : type === "shop" ? guideShop() : type === "settings" ? guideSettings() : type === "vault" ? guideVault() : guideInstall();
  $("#modal-root").innerHTML = `<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal guide-modal">${m}<div style="margin-top:14px;display:flex;justify-content:flex-end"><button class="btn gray" onclick="closeModal()">我知道了</button></div></div></div>`;
}
function guideMap() {
  const fig = `<svg viewBox="0 0 520 150" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="申请地图Key流程">
    <rect x="8" y="14" width="504" height="122" rx="12" fill="#eef1fb" stroke="#c7d0f5"/>
    <rect x="8" y="14" width="504" height="20" rx="12" fill="#dfe5fb"/>
    <circle cx="22" cy="24" r="3" fill="#ff6b6b"/><circle cx="34" cy="24" r="3" fill="#ffd93d"/><circle cx="46" cy="24" r="3" fill="#6bcb77"/>
    <text x="60" y="28" font-size="11" fill="#5b6aa8">lbs.qq.com · 控制台</text>
    <g font-size="10" fill="#fff" text-anchor="middle">
      <rect x="26" y="56" width="96" height="38" rx="8" fill="#4f6ef7"/><text x="74" y="79">① 控制台登录</text>
      <rect x="150" y="56" width="96" height="38" rx="8" fill="#4f6ef7"/><text x="198" y="79">② 创建应用</text>
      <rect x="274" y="56" width="96" height="38" rx="8" fill="#4f6ef7"/><text x="322" y="79">③ 添加 Key</text>
      <rect x="398" y="56" width="96" height="38" rx="8" fill="#16a34a"/><text x="446" y="79">④ 复制 Key</text>
    </g>
    <g stroke="#9aa6d6" stroke-width="2" fill="none"><path d="M122 75 H148"/><path d="M246 75 H272"/><path d="M370 75 H396"/></g>
    <g fill="#9aa6d6"><path d="M148 71 l8 4 l-8 4 z"/><path d="M272 71 l8 4 l-8 4 z"/><path d="M396 71 l8 4 l-8 4 z"/></g>
    <text x="260" y="120" font-size="10" fill="#7c89bf" text-anchor="middle">按 ① → ② → ③ → ④ 顺序操作，即得可用 Key</text>
  </svg>`;
  return `
  <h3>🗺️ 地图与定位 · 图文配置指引</h3>
  <div class="guide-fig">${fig}<div class="guide-cap">图：在「腾讯位置服务」控制台创建应用并生成 Key 的整体流程</div></div>
  ${guideStep("1", "🌐", "打开 <b>腾讯位置服务</b>官网 <b>lbs.qq.com</b>（国内合规地图源，也可用「高德地图开放平台」替代，流程类似）。")}
  ${guideStep("2", "🔑", "右上角「控制台」登录（支持微信扫码，首次需实名认证）。")}
  ${guideStep("3", "📁", "左侧 <b>应用管理 → 我的应用 → 创建应用</b>，名称随意，如「我的工作台」。")}
  ${guideStep("4", "➕", "进入应用后点「添加 Key」，<b>务必勾选三项</b>：JavaScriptAPI、WebServiceAPI、地点搜索。")}
  ${guideStep("5", "📋", "复制生成的 Key，回到工作台 <b>设置 → 地图与定位</b> 粘贴并保存。")}
  ${guideStep("6", "🛡️", "进入该 Key 的「设置」，把本站域名加入 <b>域名白名单</b>（防止他人盗用你的额度）。")}
  <div class="guide-tip">💡 没配 Key 时：定位、距离提示等界面都在，只是地图渲染与周边搜索需要 Key 才出数据。定位需在本站（https）下授权，离线单文件（file://）浏览器会禁用定位。</div>`;
}
function guideAi() {
  const fig = `<svg viewBox="0 0 520 150" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AI接口配置流程">
    <rect x="8" y="14" width="504" height="122" rx="12" fill="#eef1fb" stroke="#c7d0f5"/>
    <g font-size="10" fill="#fff" text-anchor="middle">
      <rect x="24" y="44" width="150" height="46" rx="8" fill="#4f6ef7"/><text x="99" y="62">开放平台申请 Key</text><text x="99" y="78" font-size="9" fill="#d6deff">混元 / 通义 / 智谱 / DeepSeek</text>
      <rect x="346" y="44" width="150" height="46" rx="8" fill="#16a34a"/><text x="421" y="62">工作台 设置→AI接口</text><text x="421" y="78" font-size="9" fill="#cdebd6">粘贴三项</text>
    </g>
    <path d="M174 67 H344" stroke="#9aa6d6" stroke-width="2" fill="none"/>
    <path d="M344 63 l8 4 l-8 4 z" fill="#9aa6d6"/>
    <g font-size="9" fill="#5b6aa8" text-anchor="middle">
      <rect x="196" y="100" width="104" height="20" rx="6" fill="#fff" stroke="#c7d0f5"/><text x="248" y="114">Base URL</text>
      <rect x="308" y="100" width="92" height="20" rx="6" fill="#fff" stroke="#c7d0f5"/><text x="354" y="114">API Key</text>
      <rect x="408" y="100" width="84" height="20" rx="6" fill="#fff" stroke="#c7d0f5"/><text x="450" y="114">模型名</text>
    </g>
  </svg>`;
  const swGrid = `<div class="sw-grid">
    <div class="sw-card"><b>腾讯混元</b><span>cloud.tencent.com</span></div>
    <div class="sw-card"><b>阿里通义</b><span>dashscope.console.aliyun.com</span></div>
    <div class="sw-card"><b>智谱 GLM</b><span>open.bigmodel.cn</span></div>
    <div class="sw-card"><b>DeepSeek</b><span>platform.deepseek.com</span></div>
    <div class="sw-card"><b>OpenAI</b><span>platform.openai.com</span></div>
  </div>`;
  const tbl = `<table class="sw-table">
    <tr><th>服务商</th><th>Base URL（接口地址）</th><th>模型名举例（需支持图片）</th></tr>
    <tr><td>腾讯混元</td><td><code>https://api.hunyuan.cloud.tencent.com/v1</code></td><td><code>hunyuan-vision</code></td></tr>
    <tr><td>阿里通义</td><td><code>https://dashscope.aliyuncs.com/compatible-mode/v1</code></td><td><code>qwen-vl-max</code></td></tr>
    <tr><td>智谱 GLM</td><td><code>https://open.bigmodel.cn/api/paas/v4</code></td><td><code>glm-4v-plus</code></td></tr>
    <tr><td>DeepSeek</td><td><code>https://api.deepseek.com/v1</code></td><td><code>deepseek-vl2</code></td></tr>
    <tr><td>OpenAI</td><td><code>https://api.openai.com/v1</code></td><td><code>gpt-4o-mini</code></td></tr>
  </table>`;
  return `
  <h3>🤖 AI 接口 · 图文配置指引</h3>
  <div class="guide-fig">${fig}<div class="guide-cap">图：在任意 OpenAI 兼容平台申请 Key，把「三项」填进工作台设置</div></div>
  ${guideStep("1", "🧩", "选一家支持「OpenAI 兼容」的服务（以下任选其一），它们都是市面上常用的多模态大模型平台：")}
  ${swGrid}
  ${guideStep("2", "🔑", "去对应开放平台注册并 <b>创建 API Key</b>（形如 <code>sk-...</code>），部分平台新用户有免费额度。")}
  ${guideStep("3", "📝", "把下面三样填进工作台 <b>设置 → AI 接口</b>（各家对照如下）：")}
  ${tbl}
  ${guideStep("4", "📸", "保存后去饮食记录页拍照，即可让 AI 识别菜品、估算营养；旅行页也能用它出「必吃必玩」清单。")}
  <div class="guide-tip">💡 密钥只存在你自己的浏览器本地，不会上传到工作台服务器。若接口返回 401，多为 Key 无效或模型名不支持图片输入。</div>`;
}
function guideSync() {
  const fig = `<svg viewBox="0 0 520 150" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="多端同步流程">
    <rect x="8" y="14" width="504" height="122" rx="12" fill="#eef1fb" stroke="#c7d0f5"/>
    <g text-anchor="middle">
      <rect x="30" y="52" width="120" height="60" rx="10" fill="#4f6ef7"/><text x="90" y="78" font-size="11" fill="#fff">📱 手机</text><text x="90" y="96" font-size="9" fill="#d6deff">记录数据</text>
      <rect x="370" y="52" width="120" height="60" rx="10" fill="#4f6ef7"/><text x="430" y="78" font-size="11" fill="#fff">💻 PC</text><text x="430" y="96" font-size="9" fill="#d6deff">记录数据</text>
    </g>
    <circle cx="260" cy="82" r="26" fill="#16a34a"/><text x="260" y="80" font-size="10" fill="#fff" text-anchor="middle">☁️ 云端</text><text x="260" y="94" font-size="9" fill="#cdebd6" text-anchor="middle">同一同步码</text>
    <path d="M150 82 H232" stroke="#9aa6d6" stroke-width="2" fill="none"/><path d="M232 78 l8 4 l-8 4 z" fill="#9aa6d6"/>
    <path d="M288 82 H370" stroke="#9aa6d6" stroke-width="2" fill="none"/><path d="M370 78 l8 4 l-8 4 z" fill="#9aa6d6"/>
    <text x="260" y="130" font-size="10" fill="#7c89bf" text-anchor="middle">用「生成新码 → 推送」与「输入同码 → 拉取」在两端间同步</text>
  </svg>`;
  return `
  <h3>☁️ 多端云同步 · 图文指引</h3>
  <div class="guide-fig">${fig}<div class="guide-cap">图：手机与 PC 共用一个同步码，通过云端互相同步数据</div></div>
  ${guideStep("1", "🔑", "在一台设备「设置 → 多端云同步」点 <b>生成新码</b>，得到形如 <code>wb-xxxx-xxxx</code> 的同步码（它也作为端到端加密的密钥）。")}
  ${guideStep("2", "⬆️", "点 <b>推送到云端</b>，把当前数据上传。若已开启「🔒 端到端加密」，云端只存密文，别人拿到也解不开。")}
  ${guideStep("3", "📲", "在另一台设备（手机或 PC）打开同一工作台，进入「设置 → 多端云同步」，把<b>同一个同步码</b>粘贴进去。")}
  ${guideStep("4", "⬇️", "点 <b>从云端拉取</b>，数据即同步过来；勾选「自动同步」后，每次保存都会自动推送，无需手动。")}
  ${guideStep("5", "🔒", "加密开启时，<b>两端同步码必须完全一致</b>才能解密；忘了码就只能重新生成（旧数据需原码才能取回）。")}
  <div class="guide-tip">💡 默认同步走公共免费云（textdb.online），已加密的数据可放心放；若想要<b>长期更可靠、多端秒级实时</b>，在设置里把「同步后端」切到 <b>Supabase</b>（托管、免费、实时推送），详见下方按钮。仍不放心时，最稳妥的是「导出 / 导入 JSON」文件备份，完全不依赖网络。</div>`;
}
function guideInstall() {
  const fig = `<svg viewBox="0 0 520 150" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="安装到手机或PC">
    <rect x="8" y="14" width="504" height="122" rx="12" fill="#eef1fb" stroke="#c7d0f5"/>
    <g text-anchor="middle">
      <rect x="30" y="40" width="64" height="100" rx="10" fill="#fff" stroke="#c7d0f5"/><text x="62" y="150" font-size="9" fill="#5b6aa8">📱 手机</text>
      <rect x="118" y="40" width="64" height="100" rx="10" fill="#4f6ef7"/><text x="150" y="96" font-size="9" fill="#fff">App</text>
      <path d="M94 86 H112" stroke="#9aa6d6" stroke-width="2"/><path d="M112 82 l6 4 l-6 4 z" fill="#9aa6d6"/>
      <rect x="330" y="38" width="160" height="70" rx="8" fill="#fff" stroke="#c7d0f5"/><text x="410" y="78" font-size="10" fill="#5b6aa8">💻 浏览器窗口</text>
      <rect x="402" y="108" width="16" height="14" rx="2" fill="#4f6ef7"/><text x="410" y="138" font-size="9" fill="#5b6aa8">安装为桌面应用</text>
    </g>
    <text x="260" y="20" font-size="10" fill="#7c89bf" text-anchor="middle">手机「添加到主屏幕」= 全屏 App；PC「安装」= 独立窗口</text>
  </svg>`;
  const mob = `<div class="guide-step"><span class="n">A</span><span class="ico">🤖</span><div class="body"><b>Android（Chrome / Edge / 华为浏览器）</b>：点右上角 ⋮ → <b>“安装应用”</b> 或“添加到主屏幕” → 确认。出现「⚡ 一键安装」时直接点即可。</div></div>
    <div class="guide-step"><span class="n">B</span><span class="ico">🍎</span><div class="body"><b>iPhone / iPad（Safari）</b>：点底部 <b>分享 ⬆︎</b> → 选 <b>“添加到主屏幕”</b> → 确认名称后“添加”。从桌面图标打开即全屏。</div></div>`;
  const pc = `<div class="guide-step"><span class="n">A</span><span class="ico">🪟</span><div class="body"><b>安装为桌面应用</b>：Chrome / Edge 中点地址栏右侧 <b>⊕“安装”</b> 图标，或菜单 → “安装工作台”，变成独立窗口、可固定任务栏（有「⚡ 一键安装」时直接点）。</div></div>
    <div class="guide-step"><span class="n">B</span><span class="ico">📦</span><div class="body"><b>下载离线版（单文件）</b>：下载 <code>standalone.html</code>，双击即可离线打开，不依赖网络（热点 / AI 等联网功能除外），可拷到任意电脑随身用。</div></div>`;
  return `
  <h3>📲 应用下载 / 安装 · 图文指引</h3>
  <div class="guide-fig">${fig}<div class="guide-cap">图：把网页工作台“安装”成手机 App 或 PC 桌面应用</div></div>
  <div style="font-weight:600;font-size:13px;margin:8px 0 2px">📱 手机端</div>
  ${mob}
  <div style="font-weight:600;font-size:13px;margin:10px 0 2px">💻 电脑端</div>
  ${pc}
  <div class="guide-tip">💡 安装 / 添加到主屏幕依赖你手机或电脑上的浏览器（Chrome / Edge / Safari 等），是系统自带能力，不需要额外下载别的软件。在线版（https）还能离线使用、自动更新。</div>`;
}
function guideShop() {
  const fig = `<svg viewBox="0 0 520 150" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="从电商App复制链接导入流程">
    <rect x="8" y="14" width="504" height="122" rx="12" fill="#eef1fb" stroke="#c7d0f5"/>
    <g text-anchor="middle" font-size="10" fill="#fff">
      <rect x="24" y="48" width="110" height="56" rx="10" fill="#ff5000"/><text x="79" y="72">① App内「分享」</text><text x="79" y="90" font-size="9" fill="#ffe">淘宝/京东/拼多多</text>
      <rect x="158" y="48" width="110" height="56" rx="10" fill="#e1251b"/><text x="213" y="72">② 复制链接</text><text x="213" y="90" font-size="9" fill="#ffe">抖音/小红书</text>
      <rect x="292" y="48" width="110" height="56" rx="10" fill="#4f6ef7"/><text x="347" y="72">③ 粘贴到工作台</text><text x="347" y="90" font-size="9" fill="#d6deff">换行可多链接</text>
      <rect x="426" y="48" width="80" height="56" rx="10" fill="#16a34a"/><text x="466" y="72">④ 导入</text><text x="466" y="90" font-size="9" fill="#cdebd6">自动识别</text>
    </g>
    <g stroke="#9aa6d6" stroke-width="2" fill="none"><path d="M134 76 H154"/><path d="M268 76 H288"/><path d="M402 76 H422"/></g>
    <g fill="#9aa6d6"><path d="M154 72 l8 4 l-8 4 z"/><path d="M288 72 l8 4 l-8 4 z"/><path d="M422 72 l8 4 l-8 4 z"/></g>
    <text x="260" y="128" font-size="10" fill="#7c89bf" text-anchor="middle">按 ① → ② → ③ → ④，把商品链接从各平台导入到购物清单</text>
  </svg>`;
  const ap = `<div class="sw-grid">
    <div class="sw-card"><b>淘宝 / 天猫</b><span>item.taobao.com</span></div>
    <div class="sw-card"><b>京东</b><span>item.jd.com</span></div>
    <div class="sw-card"><b>拼多多</b><span>mobile.yangkeduo.com</span></div>
    <div class="sw-card"><b>抖音</b><span>v.douyin.com</span></div>
    <div class="sw-card"><b>小红书</b><span>xhslink.com</span></div>
  </div>`;
  return `
  <h3>🛒 从电商导入链接 · 图文指引</h3>
  <div class="guide-fig">${fig}<div class="guide-cap">图：在各电商 App 内复制商品链接，粘贴到工作台即自动导入</div></div>
  ${guideStep("1", "📱", "打开对应 App（以下任选其一），进入你想买的商品 / 笔记详情页：")}
  ${ap}
  ${guideStep("2", "↗️", "点页面右上角的 <b>「分享」或「···」</b>，在弹出的菜单里选 <b>「复制链接」</b>（注意是“链接”，不是截图或口令）。")}
  ${guideStep("3", "📋", "回到工作台「购物清单」，把链接粘贴进文本框；<b>多个链接用换行分隔</b>可一次导入多条。")}
  ${guideStep("4", "⬇️", "点 <b>「解析并导入」</b>，系统按链接域名自动判断平台（淘宝/天猫、京东、拼多多、抖音、小红书），并生成带平台标签的卡片。")}
  ${guideStep("5", "🔍", "识别原理：先看域名定平台；若链接里带 <code>title</code> / <code>id</code> / <code>sku</code> 等参数，会尝试解析出商品名；否则显示为「平台 商品」，可<b>点开卡片链接核对</b>或手动改名。")}
  ${guideStep("6", "✅", "导入后点卡片上的状态按钮切换 <b>想要 → 已加购 → 已购买</b>，底部统计「已购合计」；「打开链接」可跳回原页面。")}
  <div class="guide-tip">💡 链接需以 <code>http</code> 开头才识别；商品详情页链接最有效，直播间 / 搜索页链接往往取不到商品名。识别不出时也可点「+ 手动添加」补全。</div>`;
}

/* ---- 首次进入相关页面：自动浮层图文指引（只弹一次） ---- */
const PAGE_GUIDE = { travel: "map", shopping: "shop", diet: "ai", kitchen: "ai", settings: "settings" };
const GUIDE_META = {
  map: { ico: "🗺️", title: "地图与定位", desc: "首次用旅行？地图、定位、附近推荐需先在「设置」配置地图 Key。" },
  ai: { ico: "🤖", title: "AI 接口", desc: "想用 AI 拍照识别 / 出题谱？先在「设置」配一个 AI 接口即可。" },
  shop: { ico: "🛒", title: "链接导入", desc: "从淘宝/京东/拼多多/抖音/小红书导入链接？点这里看怎么复制链接。" },
  settings: { ico: "⚙️", title: "常用配置", desc: "第一次用？云同步、地图、AI 接口都在这里配置，每项都有图文指引。" },
};
function maybeAutoGuide(id) {
  const type = PAGE_GUIDE[id];
  if (!type) return;
  if (type === "ai" && aiReady()) return;          // AI 指引仅在尚未配置时弹出，避免打扰已配置用户
  if (D.settings.seenGuides[type]) return;          // 已看过则永不再弹
  showGuideFloat(type);
}
function showGuideFloat(type) {
  const m = GUIDE_META[type]; if (!m) return;
  let box = $("#guide-float");
  if (!box) { box = document.createElement("div"); box.id = "guide-float"; box.className = "guide-float"; document.body.appendChild(box); }
  box.style.display = "flex";
  box.innerHTML = `
    <div class="gf-ico">${m.ico}</div>
    <div class="gf-body">
      <div class="gf-title">${m.title} · 图文指引</div>
      <div class="gf-desc">${m.desc}</div>
    </div>
    <button class="btn sm" onclick="markGuideSeen('${type}');showSetupGuide('${type}')">查看</button>
    <button class="icon-btn" onclick="dismissGuideFloat('${type}')" title="不再提示">✕</button>`;
}
function dismissGuideFloat(type) { D.settings.seenGuides[type] = true; save(true); const b = $("#guide-float"); if (b) b.style.display = "none"; }
function markGuideSeen(type) { D.settings.seenGuides[type] = true; save(true); const b = $("#guide-float"); if (b) b.style.display = "none"; }
const autoGuideShown = {};
function autoGuide(type) {
  if (D.settings.seenGuides[type] || autoGuideShown[type]) return;
  autoGuideShown[type] = true;
  D.settings.seenGuides[type] = true; save(true);
  showSetupGuide(type);
}
function guideSettings() {
  return `
  <h3>⚙️ 设置 · 快速上手</h3>
  <div class="guide-step"><span class="n">1</span><span class="ico">☁️</span><div class="body"><b>多端云同步</b>：生成同步码、推送/拉取，手机与电脑数据一致（可端到端加密）。点「📖 图文指引」看步骤。</div></div>
  <div class="guide-step"><span class="n">2</span><span class="ico">🗺️</span><div class="body"><b>地图与定位</b>：填腾讯位置服务 Key，旅行里就能定位、推荐附近、显示路线地图。</div></div>
  <div class="guide-step"><span class="n">3</span><span class="ico">🤖</span><div class="body"><b>AI 接口</b>：填任意 OpenAI 兼容接口，用于饮食拍照识别、出题谱、旅行必吃必玩。</div></div>
  <div class="guide-step"><span class="n">4</span><span class="ico">💾</span><div class="body"><b>数据备份</b>：定期导出 JSON 备份，清缓存也不丢数据。</div></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
    <button class="btn sm" onclick="closeModal();showSetupGuide('sync')">☁️ 同步指引</button>
    <button class="btn sm" onclick="closeModal();showSetupGuide('map')">🗺️ 地图指引</button>
    <button class="btn sm" onclick="closeModal();showSetupGuide('ai')">🤖 AI 指引</button>
  </div>`;
}

/* ---- 云同步（textdb.online 免费KV） ---- */
function genSyncCode() {
  const code = "wb-" + uid() + "-" + Math.random().toString(36).slice(2, 8);
  const el = $("#sync-code"); if (el) el.value = code;
  D.settings.syncCode = code;
  save(true); updateSyncChip();
  toast("已生成同步码，点「推送」上传数据，另一台设备输入此码后「拉取」");
}
/* 首启两步引导：让多端同步像 App 一样一键开通，无需看懂后端 */
function maybeShowSyncSetup() {
  if (D.settings.syncCode) return;
  openModal(`<h3>☁️ 开启多端同步</h3>
    <div style="font-size:13px;color:var(--text2);line-height:1.9;margin-bottom:14px">
      想在多台电脑和手机上共用同一份数据吗？只需两步，之后修改会自动同步，不用手动操作。
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn" onclick="syncSetupCreate()">🆕 我是第一台设备 · 一键创建同步</button>
      <button class="btn ghost" onclick="syncSetupShowJoin()">➕ 我已有同步码 · 加入</button>
      <button class="btn gray" onclick="closeModal()">稍后再说</button>
    </div>`);
}
function syncSetupCreate() {
  genSyncCode();
  D.settings.autoSync = true;
  save(true); closeModal(); renderSettings();
  toast("✅ 已创建并自动开启同步。把同步码发到手机/其他电脑，在那边选「加入」即可共用");
}
function syncSetupShowJoin() {
  openModal(`<h3>➕ 加入已有同步</h3>
    <div style="font-size:13px;color:var(--text2);line-height:1.9;margin-bottom:12px">
      把第一台设备显示的「同步码」粘贴到这里（可用微信发给自己再复制）。加入后会自动拉取那台设备的数据。
    </div>
    <div class="form-row">
      <input id="sync-join-code" placeholder="粘贴同步码" style="flex:1">
      <button class="btn" onclick="syncSetupJoin()">加入并拉取</button>
    </div>`);
}
function syncSetupJoin() {
  const inp = document.getElementById("sync-join-code");
  const code = (inp && inp.value || "").trim();
  if (!code) return toast("请先粘贴同步码");
  D.settings.syncCode = code;
  D.settings.autoSync = true;
  save(true); closeModal(); renderSettings();
  syncPullSilent().then(() => toast("✅ 已加入，正在拉取这台设备的数据")).catch(() => {});
}
function copySyncCode() {
  const c = D.settings.syncCode;
  if (!c) return toast("还没有同步码，先「生成新码」或「一键创建」");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(c).then(() => toast("✅ 已复制同步码，去手机/其他电脑粘贴")).catch(() => toast("复制失败，请手动选择文字复制"));
  } else {
    toast("当前环境不支持自动复制，请长按同步码手动选择复制");
  }
}
async function syncPush() {
  const code = $("#sync-code") ? $("#sync-code").value.trim() : D.settings.syncCode;
  if (!code) return toast("请先生成或输入同步码");
  D.settings.syncCode = code; save(true); updateSyncChip();
  if (syncBackendName() === "supabase") return supabasePushManual();
  const useEnc = D.settings.encryptSync !== false && cryptoReady();
  if (D.settings.encryptSync !== false && !cryptoReady()) toast("⚠️ 当前环境不支持加密（请用在线版同步），将明文上传");
  try {
    toast("正在推送…");
    const payload = useEnc ? await encPayload(D, code) : JSON.stringify(D);
    const fd = new URLSearchParams();
    fd.append("key", code);
    fd.append("value", payload);
    const res = await fetch("https://api.textdb.online/update/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: fd.toString() });
    const j = await res.json().catch(() => ({}));
    if (j.status !== 1 && !res.ok) throw new Error("上传失败");
    toast("✅ 已推送到云端" + (useEnc ? "（已端到端加密🔒）" : "（明文）") + "，另一台设备可拉取了");
  } catch (e) { toast("推送失败：" + e.message); }
}
async function syncPull() {
  const code = $("#sync-code") ? $("#sync-code").value.trim() : D.settings.syncCode;
  if (!code) return toast("请输入同步码");
  if (syncBackendName() === "supabase") return supabasePullManual();
  try {
    toast("正在拉取…");
    const res = await fetch(`https://textdb.online/${encodeURIComponent(code)}`, { cache: "no-store" });
    const txt = await res.text();
    if (!txt || !txt.trim().startsWith("{")) throw new Error("云端没有该同步码的数据");
    let remote;
    try { remote = await decPayload(txt, code); }
    catch (e) { throw new Error("解密失败：同步码不正确或数据已损坏"); }
    if (!remote.settings) throw new Error("数据格式不正确");
    if (maybePullStale(remote, code)) return;
    mergeRemote(remote, code);
  } catch (e) {     toast("拉取失败：" + e.message); }
}
/* 静默自动拉取：开启自动同步时由 init() 调用，按 id 合并保留本地记录，不弹窗、不阻断 */
async function syncPullSilent(silent) {
  const code = D.settings.syncCode;
  if (!code) return;
  if (syncBackendName() === "supabase") return supabasePullSilent(silent);
  if (__pulling) return;
  __pulling = true;
  try {
    const res = await fetch(`https://textdb.online/${encodeURIComponent(code)}`, { cache: "no-store" });
    const txt = await res.text();
    if (!txt || !txt.trim().startsWith("{")) { debouncePush(); return; }   // 云端无数据：把本地推上去当种子
    let remote;
    try { remote = await decPayload(txt, code); } catch (e) { debouncePush(); return; }  // 解密失败（码不符）：本地为准，推上去
    if (!remote.settings) { debouncePush(); return; }
    mergeRemote(remote, code, silent);   // 并集 + 取较新 + 剔除已删除，不丢本地
    lastSyncAt = Date.now(); syncFailCount = 0; syncState = "ok"; updateSyncChip();
    debouncePush();              // 把合并后的全集推回云端，完成双向
  } catch (e) { debouncePush(); }  // 网络异常也确保本地已上传
  finally { __pulling = false; }
}
let __pulling = false;
/* 回到前台时补拉一次：PWA 常驻后台不会重新 init()，没有这个钩子就收不到另一端的改动 */
const FG_PULL_GAP = 20000;
function foregroundPull() {
  if (!D.settings.autoSync || !D.settings.syncCode) return;
  if (Date.now() - lastSyncAt < FG_PULL_GAP) return;
  syncPullSilent(true).catch(() => {});
}
function applyRemoteData() {
  const p = window.__pendingRemote;
  if (p) { mergeRemote(p.remote, p.code); window.__pendingRemote = null; }
}
function pickNewerItem(a, b) {
  if (!b) return a;
  const ta = a.updatedAt || a.created || a.date || 0;
  const tb = b.updatedAt || b.created || b.date || 0;
  if (!ta && !tb) return a;
  return (ta >= tb) ? a : b;
}
/* 字段级合并：数组按 id 并集，冲突取较新者；设置保留本地已填配置；避免多端互相覆盖丢数据 */
function mergeRemote(remote, code, silent) {
  const sigBefore = dataSig(D);
  const arrFields = SYNC_ARR_FIELDS;
  const merged = { ...defaultData(), ...remote };
  // 两端墓碑取并集、同 id 取较晚的删除时间，并清理超期墓碑
  const tomb = {};
  [remote && remote.tombstones, D.tombstones].forEach((m) => {
    if (!m || typeof m !== "object") return;
    Object.keys(m).forEach((k) => { const t = +m[k] || 0; if (t > (tomb[k] || 0)) tomb[k] = t; });
  });
  pruneTombstones(tomb);
  // 已删除判定：条目最后修改时间晚于删除时间才算"删除后又被改过"，予以保留
  const isDeleted = (x) => {
    const t = tomb[x.id];
    if (!t) return false;
    const it = (x.updatedAt || x.created) || 0;
    return !(it > t);
  };
  arrFields.forEach((f) => {
    const L = Array.isArray(D[f]) ? D[f] : [];
    const R = Array.isArray(remote[f]) ? remote[f] : [];
    const byId = {};
    L.forEach((x) => { if (x && x.id) byId[x.id] = pickNewerItem(x, byId[x.id]); });
    R.forEach((x) => { if (x && x.id) byId[x.id] = pickNewerItem(x, byId[x.id]); });
    merged[f] = Object.values(byId).filter((x) => !isDeleted(x));
  });
  merged.tombstones = tomb;
  merged.plans = {
    daily: { ...(remote.plans && remote.plans.daily ? remote.plans.daily : {}), ...(D.plans && D.plans.daily ? D.plans.daily : {}) },
    monthly: { ...(remote.plans && remote.plans.monthly ? remote.plans.monthly : {}), ...(D.plans && D.plans.monthly ? D.plans.monthly : {}) },
  };
  const base = { ...defaultData().settings, ...(remote.settings || {}), ...D.settings };
  base.syncCode = code;
  merged.settings = base;
  const lv = D.vault && D.vault.items ? D.vault.items : [];
  const rv = remote.vault && remote.vault.items ? remote.vault.items : [];
  const vById = {}; lv.forEach((x) => { if (x && x.id) vById[x.id] = x; }); rv.forEach((x) => { if (x && x.id) vById[x.id] = x; });
  merged.vault = { salt: (remote.vault && remote.vault.salt) || (D.vault && D.vault.salt) || "", items: Object.values(vById).filter((x) => !isDeleted(x)) };
  merged.updatedAt = Math.max(D.updatedAt || 0, remote.updatedAt || 0);
  D = merged;
  save(true); updateSyncChip(); applyTheme();
  const changed = dataSig(D) !== sigBefore;
  if (!silent) {
    RENDER[cur] && RENDER[cur]();
    toast("✅ 已合并云端与本地数据（按 id 合并，未丢失本地记录）");
  } else if (changed) {
    RENDER[cur] && RENDER[cur]();
    toast("☁️ 已拉取云端最新改动");
  }
}
let pushTimer;
let lastSyncAt = 0, syncFailCount = 0, syncState = "idle";
function debouncePush() { clearTimeout(pushTimer); pushTimer = setTimeout(() => syncPushSilent(), 3000); }
async function syncPushSilent() {
  syncState = "syncing"; updateSyncChip();
  if (syncBackendName() === "supabase") return supabasePushSilent();
  try {
    const useEnc = D.settings.encryptSync !== false && cryptoReady();
    const payload = useEnc ? await encPayload(D, D.settings.syncCode) : JSON.stringify(D);
    if (payload.length > 950000 && !window.__sizeWarned) {
      window.__sizeWarned = true;
      toast("⚠️ 数据量较大，云端同步可能变慢或受限；建议定期「导出全部数据」备份一份");
    }
    const fd = new URLSearchParams();
    fd.append("key", D.settings.syncCode);
    fd.append("value", payload);
    await fetch("https://api.textdb.online/update/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: fd.toString() });
    lastSyncAt = Date.now(); syncFailCount = 0; syncState = "ok"; updateSyncChip();
  } catch (e) {
    syncFailCount++; syncState = "err"; updateSyncChip();
    if (syncFailCount <= 5) setTimeout(() => syncPushSilent(), Math.min(30000, 2000 * Math.pow(2, syncFailCount - 1))); // 指数退避重试
  }
}
function relTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "刚刚";
  if (s < 3600) return Math.floor(s / 60) + " 分钟前";
  if (s < 86400) return Math.floor(s / 3600) + " 小时前";
  return Math.floor(s / 86400) + " 天前";
}
function updateSyncChip() {
  const chip = $("#sync-chip"); if (!chip) return;
  const txt = $("#sync-chip-text"); if (!txt) return;
  const on = !!D.settings.syncCode;
  chip.classList.toggle("on", on);
  chip.classList.toggle("err", on && syncState === "err" && syncFailCount > 0);
  if (!on) { txt.textContent = "未开启云同步"; return; }
  if (syncState === "syncing") { txt.textContent = "☁️ 同步中…"; return; }
  if (syncState === "err" && syncFailCount > 0) { txt.textContent = "⚠️ 同步失败，重试中(" + syncFailCount + ")"; return; }
  if (lastSyncAt) txt.textContent = "☁️ 已同步 · " + relTime(lastSyncAt);
  else txt.textContent = "☁️ 云同步：" + D.settings.syncCode.slice(0, 12) + "…";
}

/* ---- Supabase 实时同步后端（与 textdb 并列，更可靠、支持实时推送） ---- */
const SUPABASE_SQL = `CREATE TABLE IF NOT EXISTS wb_sync (
  code text PRIMARY KEY,
  data text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE wb_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON wb_sync FOR ALL TO anon USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE wb_sync;
-- 说明：数据以同步码为密钥端到端加密后存储，Supabase 只存密文；
-- 同步码即访问凭证（不可猜测），匿名策略仅作通道，机密性由加密保证。`;
function syncBackendName() { return D.settings.syncBackend === "supabase" ? "supabase" : "textdb"; }
function getSupabaseCfg() {
  return {
    url: (D.settings.supabaseUrl || "").trim().replace(/\/+$/, ""),
    anon: (D.settings.supabaseAnon || "").trim(),
    code: (D.settings.syncCode || "").trim(),
  };
}
async function preparePayload() {
  const useEnc = D.settings.encryptSync !== false && cryptoReady();
  const payload = useEnc ? await encPayload(D, D.settings.syncCode) : JSON.stringify(D);
  if (payload.length > 950000 && !window.__sizeWarned) {
    window.__sizeWarned = true;
    toast("⚠️ 数据量较大，同步可能变慢或受限；建议定期「导出全部数据」备份一份");
  }
  return { payload, useEnc };
}
/* 云端数据比本地旧时的确认弹窗：返回 true 表示已弹窗（调用方应 return） */
function maybePullStale(remote, code) {
  if (remote.updatedAt && D.updatedAt && remote.updatedAt < D.updatedAt && dataCount() > 0) {
    const fmt = (ts) => new Date(ts).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    openModal(`<h3>⚠️ 云端数据比本地旧</h3>
      <div style="font-size:13px;color:var(--text2);line-height:1.9;margin-bottom:12px">
        本地最后修改：<b>${fmt(D.updatedAt)}</b><br>云端最后修改：<b>${fmt(remote.updatedAt)}</b><br>
        拉取会用<b>较旧的云端数据覆盖本地</b>，本地新增内容将丢失。通常此时应该点「推送」而不是「拉取」。</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" onclick="closeModal();syncPush()">⬆ 改为推送本地到云端（推荐）</button>
        <button class="btn danger" onclick="closeModal();applyRemoteData()">仍用云端覆盖本地</button>
        <button class="btn gray" onclick="closeModal()">取消</button>
      </div>`);
    window.__pendingRemote = { remote, code };
    return true;
  }
  return false;
}
function setSyncBackend(b) {
  D.settings.syncBackend = b; save(true); renderSettings();
  if (b === "supabase") {
    if (D.settings.supabaseUrl && D.settings.supabaseAnon) initSupabaseRealtime();
    if (D.settings.autoSync && D.settings.syncCode) syncPullSilent().catch(() => {});
  } else {
    stopSupabaseRealtime();
  }
}
function saveSupabaseCfg() {
  const u = document.getElementById("supabase-url");
  const a = document.getElementById("supabase-anon");
  if (!u || !a) return;
  D.settings.supabaseUrl = u.value.trim();
  D.settings.supabaseAnon = a.value.trim();
  D.settings.syncBackend = "supabase";
  save(true); renderSettings();
  toast("✅ 已保存 Supabase 配置");
  initSupabaseRealtime();
  if (D.settings.autoSync && D.settings.syncCode) syncPullSilent().catch(() => {});
}
function testSupabase() {
  const { url, anon } = getSupabaseCfg();
  if (!url || !anon) return toast("请先填写 URL 与 anon key");
  const st = document.getElementById("supabase-status");
  if (st) st.innerHTML = "⏳ 连接测试中…";
  fetch(`${url}/rest/v1/wb_sync?code=eq.__test__&select=code&limit=1`, { headers: { "apikey": anon, "Authorization": `Bearer ${anon}` } })
    .then((r) => { if (st) st.innerHTML = r.ok ? "✅ 连接成功（表可访问）" : "⚠️ 连接失败：HTTP " + r.status + "（请确认已建表并开启匿名访问）"; })
    .catch((e) => { if (st) st.innerHTML = "⚠️ 连接失败：" + e.message; });
}
async function migrateToSupabase() {
  const { url, anon, code } = getSupabaseCfg();
  if (!url || !anon) return toast("请先填写并保存 Supabase 配置");
  if (!code) return toast("请先生成或输入同步码");
  D.settings.syncBackend = "supabase"; save(true);
  await syncPushSilent();
  toast("✅ 已将本地数据推送到 Supabase，其他设备选 Supabase + 同一同步码即可共用");
}
async function supabasePushManual() {
  const { url, anon, code } = getSupabaseCfg();
  if (!url || !anon || !code) return toast("请先填写并保存 Supabase 配置（或切回免费云）");
  try {
    toast("正在推送…");
    const { payload, useEnc } = await preparePayload();
    const res = await fetch(`${url}/rest/v1/wb_sync`, {
      method: "POST",
      headers: { "apikey": anon, "Authorization": `Bearer ${anon}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ code, data: payload, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error("HTTP " + res.status + " " + t.slice(0, 120)); }
    toast("✅ 已推送到 Supabase" + (useEnc ? "（已端到端加密🔒）" : "（明文）") + "，另一台设备可拉取了");
  } catch (e) { toast("推送失败：" + e.message); }
}
async function supabasePushSilent() {
  syncState = "syncing"; updateSyncChip();
  try {
    const { url, anon, code } = getSupabaseCfg();
    if (!url || !anon || !code) return;
    const { payload } = await preparePayload();
    const res = await fetch(`${url}/rest/v1/wb_sync`, {
      method: "POST",
      headers: { "apikey": anon, "Authorization": `Bearer ${anon}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ code, data: payload, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    lastSyncAt = Date.now(); syncFailCount = 0; syncState = "ok"; updateSyncChip();
  } catch (e) {
    syncFailCount++; syncState = "err"; updateSyncChip();
    if (syncFailCount <= 5) setTimeout(() => syncPushSilent(), Math.min(30000, 2000 * Math.pow(2, syncFailCount - 1)));
  }
}
async function supabaseFetchRemote(code) {
  const { url, anon } = getSupabaseCfg();
  const res = await fetch(`${url}/rest/v1/wb_sync?code=eq.${encodeURIComponent(code)}&select=code,data,updated_at`, {
    headers: { "apikey": anon, "Authorization": `Bearer ${anon}` }, cache: "no-store",
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length || !rows[0].data) return null;
  let remote;
  try { remote = await decPayload(rows[0].data, code); } catch (e) { throw new Error("解密失败：同步码不正确或数据已损坏"); }
  if (!remote.settings) throw new Error("数据格式不正确");
  return remote;
}
async function supabasePullManual() {
  const { url, anon, code } = getSupabaseCfg();
  if (!url || !anon || !code) return toast("请先填写并保存 Supabase 配置");
  try {
    toast("正在拉取…");
    const remote = await supabaseFetchRemote(code);
    if (!remote) throw new Error("云端没有该同步码的数据");
    if (maybePullStale(remote, code)) return;
    mergeRemote(remote, code);
  } catch (e) { toast("拉取失败：" + e.message); }
}
async function supabasePullSilent(silent) {
  const code = D.settings.syncCode;
  if (!code) return;
  if (__pulling) return;
  __pulling = true;
  try {
    const { url, anon } = getSupabaseCfg();
    if (!url || !anon) { debouncePush(); return; }
    const remote = await supabaseFetchRemote(code);
    if (!remote) { debouncePush(); return; }   // 云端无数据：推本地当种子
    mergeRemote(remote, code, silent);
    lastSyncAt = Date.now(); syncFailCount = 0; syncState = "ok"; updateSyncChip();
    debouncePush();
  } catch (e) { debouncePush(); }
  finally { __pulling = false; }
}
/* Realtime：在线时懒加载 supabase-js，监听本行变更即拉取；CDN 不可达则降级为已有的 45s 轮询 */
let __sbClient = null, __sbChannel = null;
function stopSupabaseRealtime() {
  try { if (__sbChannel && __sbClient) __sbClient.removeChannel(__sbChannel); } catch (_) {}
  __sbChannel = null; __sbClient = null;
}
function initSupabaseRealtime() {
  const { url, anon, code } = getSupabaseCfg();
  if (!url || !anon || !code) return;
  if (window.supabase && window.supabase.createClient) { __attachSbRealtime(url, anon, code); return; }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  s.onload = () => __attachSbRealtime(url, anon, code);
  s.onerror = () => { const st = document.getElementById("supabase-status"); if (st && !/实时/.test(st.innerHTML)) st.innerHTML = "ℹ️ 实时通道（WebSocket）未能加载，已用定时轮询兜底（仍会自动同步）"; };
  document.head.appendChild(s);
}
function __attachSbRealtime(url, anon, code) {
  try {
    stopSupabaseRealtime();
    __sbClient = window.supabase.createClient(url, anon, { realtime: { params: { eventsPerSecond: 5 } } });
    __sbChannel = __sbClient.channel("wb_sync:" + code)
      .on("postgres_changes", { event: "*", schema: "public", table: "wb_sync", filter: "code=eq." + code }, () => { syncPullSilent(true).catch(() => {}); })
      .subscribe((status) => {
        const st = document.getElementById("supabase-status");
        if (!st) return;
        if (status === "SUBSCRIBED") st.innerHTML = "⚡ 实时通道已连接，多端改动将秒级同步";
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") st.innerHTML = "ℹ️ 实时通道异常，已回落定时轮询";
      });
  } catch (e) { /* 忽略，轮询兜底 */ }
}
function showSupabaseSql() {
  openModal(`<h3>📄 Supabase 建表 SQL</h3>
    <div style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:10px">复制下面整段，到 Supabase 项目的 <b>SQL Editor</b> 粘贴执行（只需一次）。执行后再在工作台填入项目 URL 与 anon key。</div>
    <pre class="file-pre" style="max-height:46vh;overflow:auto;white-space:pre-wrap">${esc(SUPABASE_SQL)}</pre>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" onclick="copySupabaseSql()">复制 SQL</button><button class="btn gray" onclick="closeModal()">关闭</button></div>`);
}
function copySupabaseSql() {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(SUPABASE_SQL).then(() => toast("已复制建表 SQL")).catch(() => toast("复制失败，请手动选择"));
  else toast("当前环境不支持自动复制，请手动选择 SQL 文本");
}
/* ---- 备份 ---- */
function exportData() {
  const blob = new Blob([JSON.stringify(D, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `工作台备份_${todayStr()}.json`;
  a.click();
  D.settings.lastBackup = Date.now();
  save(true); checkBackupReminder();
  toast("已导出备份文件 ✅");
}
function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (!d.settings) throw new Error("格式不正确");
      D = { ...defaultData(), ...d };
      D.settings = { ...defaultData().settings, ...(d.settings || {}) };
      save(); updateSyncChip(); applyTheme(); RENDER[cur]();
      toast("✅ 备份导入成功");
    } catch (e) { toast("导入失败：文件格式不正确"); }
  };
  reader.readAsText(file);
  input.value = "";
}
function clearAll() {
  openModal(`<h3>⚠️ 确认清空全部数据？</h3>
    <div style="font-size:13px;color:var(--text2);margin-bottom:14px">此操作不可恢复，建议先导出备份。</div>
    <div style="display:flex;gap:8px">
      <button class="btn danger" onclick="D=defaultData();save(true);closeModal();updateSyncChip();RENDER[cur]();toast('已清空')">确认清空</button>
      <button class="btn gray" onclick="closeModal()">取消</button>
    </div>`);
}

/* ================= 月度报表导出（打印为 PDF） ================= */
function exportMonthPdf() {
  const list = D.money.filter((x) => x.date.startsWith(moneyMonth));
  const inc = list.filter((x) => x.type === "收入" && moneyCounted(x)).reduce((a, b) => a + b.amount, 0);
  const exp = list.filter((x) => x.type === "支出" && moneyCounted(x)).reduce((a, b) => a + b.amount, 0);
  const byCat = {};
  list.filter((x) => x.type === "支出" && moneyCounted(x)).forEach((x) => byCat[x.cat] = (byCat[x.cat] || 0) + x.amount);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const b = D.moneyBudgets[moneyMonth];
  const w = window.open("", "_blank");
  if (!w) return toast("浏览器拦截了弹窗，请允许后重试");
  w.document.write(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${moneyMonth} 记账报表</title>
  <style>body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:720px;margin:24px auto;padding:0 20px;color:#1c2333;font-size:14px}
  h1{font-size:22px}table{border-collapse:collapse;width:100%;margin-top:12px}td,th{border:1px solid #ddd;padding:6px 10px;font-size:13px;text-align:left}
  .sum{display:flex;gap:18px;margin:12px 0;flex-wrap:wrap}.sum div{flex:1;min-width:120px;border:1px solid #eee;border-radius:10px;padding:10px}.k{font-size:12px;color:#666}.v{font-size:18px;font-weight:700}
  @media print{.noprint{display:none}}</style></head><body>
  <button class="noprint" style="padding:8px 18px;background:#4f6ef7;color:#fff;border:none;border-radius:8px;cursor:pointer" onclick="window.print()">🖨 打印 / 存为PDF</button>
  <h1>💰 ${moneyMonth} 记账报表</h1>
  <div class="sum">
    <div><div class="k">收入</div><div class="v" style="color:#16a34a">${fmtMoney(inc)}</div></div>
    <div><div class="k">支出</div><div class="v" style="color:#e11d48">${fmtMoney(exp)}</div></div>
    <div><div class="k">结余</div><div class="v">${fmtMoney(inc - exp)}</div></div>
    <div><div class="k">预算</div><div class="v">${b ? fmtMoney(b) : "—"}</div></div>
  </div>
  <h2 style="font-size:15px">支出分类</h2>
  ${cats.length ? `<table><tr><th>分类</th><th>金额</th><th>占比</th></tr>${cats.map(([c, v]) => `<tr><td>${esc(c)}</td><td>${fmtMoney(v)}</td><td>${Math.round(v / exp * 100)}%</td></tr>`).join("")}</table>` : "<p>暂无支出</p>"}
  <h2 style="font-size:15px">账单明细（${list.length}）</h2>
  <table><tr><th>日期</th><th>类型</th><th>分类</th><th>备注</th><th>金额</th></tr>
  ${list.slice().sort((a, b) => b.date.localeCompare(a.date)).map((x) => `<tr><td>${x.date}</td><td>${x.type}</td><td>${esc(x.cat)}</td><td>${esc(x.note || "")}</td><td style="color:${x.type === "支出" ? "#e11d48" : "#16a34a"}">${x.type === "支出" ? "-" : "+"}${fmtMoney(x.amount)}</td></tr>`).join("")}
  </table>
  <p style="color:#666;font-size:12px;margin-top:24px">由「生活工作台」生成 · ${todayStr()}</p>
  </body></html>`);
  w.document.close();
}

/* ================= 习惯打卡 ================= */
function habitStreak(h) {
  if (!h.history) return 0;
  let s = 0; const d = new Date();
  if (!h.history[todayStr()]) d.setDate(d.getDate() - 1);
  while (true) {
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (h.history[ds]) { s++; d.setDate(d.getDate() - 1); } else break;
  }
  return s;
}
function habitHeatHtml(h) {
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const on = !!(h.history && h.history[ds]);
    cells.push(`<div class="streak-cell ${on ? "on" : ""}" title="${ds}${on ? " · 已打卡" : ""}"><span>${d.getDate()}</span></div>`);
  }
  return `<div class="streak-grid" style="margin-top:10px">${cells.join("")}</div>`;
}
function habitCardHtml(h) {
  const done = !!(h.history && h.history[todayStr()]);
  const streak = habitStreak(h);
  const total = h.history ? Object.keys(h.history).length : 0;
  if (h.type === "num") {
    const todayVal = (h.history && h.history[todayStr()]) || "";
    const tgt = h.target ? ` / 目标 ${h.target}${h.unit || ""}` : "";
    return `<div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:22px">${esc(h.icon || "🔥")}</span>
        <div class="grow"><div class="title" style="font-size:15px;font-weight:600">${esc(h.name)}</div>
        <div class="sub">连续 ${streak} 天 · 累计 ${total} 次${tgt}</div></div>
        <button class="icon-btn" onclick="delHabit('${h.id}')">✕</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="hbv-${h.id}" type="number" step="0.1" value="${todayVal}" placeholder="今日${esc(h.unit || "")}" style="width:120px" onkeydown="if(event.key==='Enter')recordHabitNum('${h.id}')">
        <button class="btn sm" onclick="recordHabitNum('${h.id}')">📝 记录</button>
        <span class="tag ${streak > 0 ? "lo" : "blue"}">🔥 ${streak} 天连续</span>
      </div>
      ${habitHeatHtml(h)}
    </div>`;
  }
  return `<div class="card">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:22px">${esc(h.icon || "🔥")}</span>
      <div class="grow"><div class="title" style="font-size:15px;font-weight:600">${esc(h.name)}</div>
      <div class="sub">连续 ${streak} 天 · 累计 ${total} 次</div></div>
      <button class="icon-btn" onclick="delHabit('${h.id}')">✕</button>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button class="btn sm ${done ? "gray" : ""}" onclick="toggleHabit('${h.id}')">${done ? "✅ 今日已打卡" : "☀️ 打卡"}</button>
      <span class="tag ${streak > 0 ? "lo" : "blue"}">🔥 ${streak} 天连续</span>
    </div>
    ${habitHeatHtml(h)}
  </div>`;
}
function recordHabitNum(id) {
  const h = D.habits.find((x) => x.id === id); if (!h) return;
  const v = parseFloat($("#hbv-" + id).value);
  if (isNaN(v)) return toast("请输入数值");
  h.history = h.history || {};
  h.history[todayStr()] = v;
  save(); renderHabits();
}
function renderHabits() {
  const list = D.habits;
  $("#sec-habits").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <h3>🔥 新增习惯</h3>
    <div class="form-row">
      <input id="hb-name" placeholder="习惯名，如：每天喝水2L / 阅读30分钟" style="flex:2">
      <input id="hb-icon" placeholder="图标emoji" value="🔥" style="flex:0 1 80px" maxlength="4">
      <select id="hb-type" onchange="hbTypeChange()">
        <option value="bool">✓ 打卡型</option>
        <option value="num">🔢 数值型</option>
      </select>
    </div>
    <div id="hb-num-fields" style="display:none" class="form-row">
      <input id="hb-target" type="number" step="0.1" placeholder="目标值(可选)">
      <input id="hb-unit" placeholder="单位，如 分钟/L/页" style="flex:1">
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
      <button class="btn" onclick="addHabit()">+ 添加</button>
      <button class="btn ghost sm" onclick="openHabitTemplates()">📋 从模板添加</button>
    </div>
    <div style="font-size:12px;color:var(--text2);margin-top:8px">打卡型每天点一下累计连续天数；数值型记录每日数量（如饮水量、阅读页数）。</div>
  </div>
  ${allHabitsHeatHtml()}
  <div class="grid cols-2">
    ${list.length ? list.map(habitCardHtml).join("") : '<div class="empty" style="grid-column:1/-1">还没有习惯，添加一个开始打卡吧</div>'}
  </div>`;
}
function hbTypeChange() {
  const el = $("#hb-num-fields"); if (!el) return;
  el.style.display = $("#hb-type").value === "num" ? "" : "none";
}
function addHabit() {
  const name = $("#hb-name").value.trim();
  if (!name) return toast("请输入习惯名");
  const type = $("#hb-type").value;
  const h = { id: uid(), name, icon: $("#hb-icon").value.trim() || "🔥", type, history: {} };
  if (type === "num") {
    const t = parseFloat($("#hb-target").value);
    const u = $("#hb-unit").value.trim();
    if (!isNaN(t)) h.target = t;
    if (u) h.unit = u;
  }
  D.habits.push(h);
  save(); renderHabits(); toast("已添加习惯");
}
function toggleHabit(id) {
  const h = D.habits.find((x) => x.id === id); if (!h) return;
  h.history = h.history || {};
  if (h.history[todayStr()]) delete h.history[todayStr()]; else h.history[todayStr()] = 1;
  save(); renderHabits();
}
function delHabit(id) { tombstone(id); D.habits = D.habits.filter((x) => x.id !== id); save(); renderHabits(); }

/* ================= 隐私保险箱（AES-GCM） ================= */
let vaultKey = null;
function vaultUnlocked() { return !!vaultKey; }
async function vaultEnsureKey(pass) {
  if (!D.vault.salt) D.vault.salt = uid() + Math.random().toString(36).slice(2, 10);
  vaultKey = await deriveKey(pass + "::" + D.vault.salt);
}
async function vaultEncryptItem(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, vaultKey, new TextEncoder().encode(JSON.stringify(obj)));
  return { id: uid(), iv: _b64enc(iv), data: _b64enc(new Uint8Array(ct)) };
}
async function vaultDecryptItem(it) {
  if (!vaultKey || !it) return null;
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: _b64dec(it.iv) }, vaultKey, _b64dec(it.data));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch (e) { return null; }
}
function vaultItemHtml(item) {
  const d = item.d;
  return `<div class="card">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div class="grow"><div class="title" style="font-size:15px;font-weight:600">${esc(d.title || "未命名")}</div>${d.user ? `<div class="sub">👤 ${esc(d.user)}</div>` : ""}</div>
      <button class="icon-btn" onclick="delVaultItem('${item.it.id}')">✕</button>
    </div>
    ${d.pass ? `<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><code style="flex:1;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:13px;word-break:break-all">${esc(d.pass)}</code><button class="btn sm ghost" onclick="copyText(${jsStr(d.pass)})">复制</button></div>` : ""}
    ${d.note ? `<div class="sub">${esc(d.note)}</div>` : ""}
  </div>`;
}
async function renderVaults() {
  if (!vaultUnlocked()) {
    const has = (D.vault.items || []).length > 0;
    $("#sec-vault").innerHTML = `
    <div class="card" style="max-width:520px;margin:0 auto">
      <h3>🔐 隐私保险箱</h3>
      <div style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:12px">
        用独立的主密码加密保存账号密码 / 证件。内容在本地以密文存储，即使导出备份也是加密的；忘记主密码无法恢复（请记牢）。
      </div>
      <label class="fl">${has ? "主密码（解锁）" : "设置保险箱主密码"}</label>
      <input id="vault-pass" type="password" placeholder="设置一个好记又复杂的主密码" onkeydown="if(event.key==='Enter')${has ? "vaultUnlock()" : "vaultSetup()"}">
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn" onclick="${has ? "vaultUnlock()" : "vaultSetup()"}">${has ? "🔓 解锁" : "🔐 设置并解锁"}</button>
        <button class="btn ghost" onclick="showSetupGuide('vault')">📖 说明</button>
      </div>
    </div>`;
    return;
  }
  const items = [];
  for (const it of (D.vault.items || [])) { const d = await vaultDecryptItem(it); if (d) items.push({ it, d }); }
  $("#sec-vault").innerHTML = `
  <div class="card" style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
    <div><div style="font-weight:700;font-size:15px">🔐 隐私保险箱</div><div style="font-size:12px;color:var(--green);margin-top:3px">已解锁 · 共 ${items.length} 条（本地加密存储）</div></div>
    <button class="btn sm gray" onclick="vaultLock()">🔒 锁定</button>
  </div>
  <div class="card" style="margin-bottom:16px">
    <h3>➕ 新增条目</h3>
    <div class="form-row">
      <input id="vk-title" placeholder="标题，如：工行卡 / GitHub" style="flex:2">
      <input id="vk-user" placeholder="账号/用户名" style="flex:2">
    </div>
    <div class="form-row">
      <input id="vk-pass" type="text" placeholder="密码/证件号" style="flex:2">
      <input id="vk-note" placeholder="备注(可选)" style="flex:1">
      <button class="btn" onclick="addVaultItem()">保存</button>
    </div>
  </div>
  <div class="grid cols-2">
    ${items.length ? items.map(vaultItemHtml).join("") : '<div class="empty" style="grid-column:1/-1">保险箱是空的，添加第一条吧</div>'}
  </div>`;
}
async function vaultSetup() {
  const pass = $("#vault-pass").value;
  if (!pass || pass.length < 4) return toast("主密码至少 4 位");
  await vaultEnsureKey(pass);
  window.__vaultPass = pass;
  save(true);
  toast("🔐 保险箱已设置并解锁");
  renderVaults();
}
async function vaultUnlock() {
  const pass = $("#vault-pass").value;
  if (!pass) return toast("请输入主密码");
  if (!D.vault.salt) return vaultSetup();
  try {
    await vaultEnsureKey(pass);
    if ((D.vault.items || []).length) { const ok = await vaultDecryptItem(D.vault.items[0]); if (!ok) throw new Error("密码错误"); }
  } catch (e) { vaultKey = null; return toast("❌ 主密码不正确（加密内容无法解密）"); }
  window.__vaultPass = pass;
  renderVaults();
}
function vaultLock() { vaultKey = null; renderVaults(); }
async function addVaultItem() {
  const title = $("#vk-title").value.trim();
  if (!title) return toast("请输入标题");
  const obj = { title, user: $("#vk-user").value.trim(), pass: $("#vk-pass").value, note: $("#vk-note").value.trim() };
  const it = await vaultEncryptItem(obj);
  D.vault.items.push(it);
  save(true);
  renderVaults();
  toast("已加密保存");
}
function delVaultItem(id) { tombstone(id); D.vault.items = D.vault.items.filter((x) => x.id !== id); save(true); renderVaults(); }
function copyText(t) { if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast("已复制")).catch(() => toast("复制失败")); else toast("当前环境不支持复制"); }
function guideVault() {
  return `
  <h3>🔐 隐私保险箱 · 说明</h3>
  <div class="guide-step"><span class="n">1</span><span class="ico">🔑</span><div class="body">第一次进入会让你<b>设置一个独立主密码</b>，它只用于加密保险箱，和云同步码、AI Key 都无关。</div></div>
  <div class="guide-step"><span class="n">2</span><span class="ico">🔒</span><div class="body">账号密码以 <b>AES-GCM 密文</b>存在你浏览器本地；导出 JSON 备份时也是加密的，别人拿到也解不开。</div></div>
  <div class="guide-step"><span class="n">3</span><span class="ico">⚠️</span><div class="body">主密码<b>不存任何服务器</b>，忘记就无法恢复保险箱内容，请务必记牢或用密码管理器保管。</div></div>
  <div class="guide-tip">💡 适合存放不常用但重要的账号/证件；高频密码仍建议用专业密码管理器。</div>`;
}

/* ================= AI 复盘 / 智能洞察 ================= */
let reviewKind = "7d";
let lastReviewTxt = "";

const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function addDaysStr(dateStr, n) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n); return fmtDate(d); }
function monthRangeStr(ms) {
  const [y, m] = ms.split("-").map(Number);
  const first = `${y}-${pad(m)}-01`;
  const last = new Date(y, m, 0);
  return { from: first, to: fmtDate(last) };
}
function prevMonthStr() { const d = new Date(); d.setDate(0); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function reviewRange(kind) {
  const t = new Date();
  const today = fmtDate(t);
  if (kind === "yesterday") return { from: addDaysStr(today, -1), to: addDaysStr(today, -1), label: "昨日" };
  if (kind === "7d") return { from: addDaysStr(today, -6), to: today, label: "近 7 天" };
  if (kind === "30d") return { from: addDaysStr(today, -29), to: today, label: "近 30 天" };
  if (kind === "month") { const r = monthRangeStr(monthStr(t)); return { ...r, to: today, label: "本月（至今）" }; }
  if (kind === "lastmonth") { const r = monthRangeStr(prevMonthStr()); return { ...r, label: "上月" }; }
  return { from: addDaysStr(today, -6), to: today, label: "近 7 天" };
}
function toDateStr(ts) { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function tally(arr, keyFn, topN) {
  const m = {};
  arr.forEach((x) => { const k = keyFn(x); if (k) m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, topN || 8);
}
function sum(arr, f) { return arr.reduce((a, b) => a + (f(b) || 0), 0); }

function buildReviewPrompt(kind) {
  const { from, to, label } = reviewRange(kind);
  const inR = (d) => d >= from && d <= to;
  const s = D.settings;
  const totalDays = Math.max(1, Math.round((new Date(to + "T00:00:00") - new Date(from + "T00:00:00")) / 86400000) + 1);

  const meals = D.meals.filter((m) => inR(m.date));
  const mealDays = new Set(meals.map((m) => m.date)).size;
  const mKcal = sum(meals, (m) => m.kcal), mP = sum(meals, (m) => m.p), mC = sum(meals, (m) => m.c), mF = sum(meals, (m) => m.f);
  const topFoods = tally(meals, (m) => m.name).map((x) => `${x[0]}(${x[1]}次)`);

  const weights = D.weights.filter((w) => inR(w.date)).sort((a, b) => a.date.localeCompare(b.date));
  let weightLine = "无体重记录";
  if (weights.length) {
    const first = weights[0], last = weights[weights.length - 1];
    const delta = r1(last.kg - first.kg);
    let bmi = "";
    if (s.height) { const h = parseFloat(s.height) / 100; bmi = `，BMI≈${r1(last.kg / (h * h))}`; }
    const vals = weights.map((w) => w.kg);
    weightLine = `记录 ${weights.length} 次，从 ${first.kg}kg(${first.date}) 到 ${last.kg}kg(${last.date})，区间变化 ${delta >= 0 ? "+" : ""}${delta}kg${bmi}；最高 ${Math.max(...vals)} / 最低 ${Math.min(...vals)}`;
  }

  const study = D.study.filter((x) => inR(x.date));
  const studyDays = new Set(study.map((x) => x.date)).size;
  const studyMin = sum(study, (x) => x.minutes || 0);
  const subj = tally(study, (x) => x.subject).map((x) => `${x[0]}:${x[1]}次`).join("、");
  const studyLine = study.length ? `打卡 ${study.length} 次（${studyDays} 天），共 ${studyMin} 分钟，日均 ${Math.round(studyMin / Math.max(1, studyDays))} 分钟/天；科目：${subj || "无"}` : "无学习打卡";

  const todos = D.todos.filter((x) => (x.created && inR(toDateStr(x.created))) || (x.due && inR(x.due)));
  const todoDone = todos.filter((x) => x.done).length;
  const todoOpen = todos.length - todoDone;
  const overdue = D.todos.filter((x) => !x.done && x.due && x.due < todayStr()).length;
  const todoLine = todos.length ? `区间共 ${todos.length} 条（已完成 ${todoDone} / 未完成 ${todoOpen}），完成率 ${Math.round(todoDone / todos.length * 100)}%；当前积压逾期待办 ${overdue} 条` : "该区间无待办";

  const sch = D.schedule.filter((x) => inR(x.date));
  const schLine = sch.length ? `日程 ${sch.length} 条` : "无日程";

  const habitsLine = (D.habits || []).length
    ? (D.habits).map((h) => {
        const keys = Object.keys(h.history || {}).filter(inR);
        const daysIn = Math.max(1, Math.round((new Date(to + "T00:00:00") - new Date(from + "T00:00:00")) / 86400000) + 1);
        return `${h.name}(区间打卡${keys.length}/${daysIn}天, 当前连续${habitStreak(h)}天)`;
      }).join("；")
    : "未设置习惯";

  const exp = D.money.filter((x) => inR(x.date) && x.type === "支出");
  const expSum = sum(exp, (x) => x.amount);
  const expCats = tally(exp, (x) => x.cat, 5).map((x) => `${x[0]}:${fmtMoney(x[1])}`);
  let moneyLine = exp.length ? `支出 ${exp.length} 笔，合计 ${fmtMoney(expSum)}；主要类别：${expCats.join("、") || "无"}` : "无支出记录";
  if (kind === "month" || kind === "lastmonth") {
    const bud = D.moneyBudgets[from.slice(0, 7)];
    if (bud) moneyLine += `；预算 ${fmtMoney(bud)}，${expSum > bud ? "已超支 " + fmtMoney(expSum - bud) : "剩余 " + fmtMoney(bud - expSum)}`;
  }

  let compareLine = "";
  if (kind === "month" || kind === "lastmonth") {
    const cmpKind = kind === "month" ? "lastmonth" : "month";
    const cr = reviewRange(cmpKind);
    const cinR = (d) => d >= cr.from && d <= cr.to;
    const cStudyMin = sum(D.study.filter((x) => cinR(x.date)), (x) => x.minutes || 0);
    const cExp = sum(D.money.filter((x) => cinR(x.date) && x.type === "支出"), (x) => x.amount);
    const cWeights = D.weights.filter((w) => cinR(w.date)).sort((a, b) => a.date.localeCompare(b.date));
    const cWdelta = cWeights.length >= 2 ? r1(cWeights.at(-1).kg - cWeights[0].kg) : null;
    const cTodos = D.todos.filter((x) => (x.created && cinR(toDateStr(x.created))));
    const cDone = cTodos.filter((x) => x.done).length;
    const cRate = cTodos.length ? Math.round(cDone / cTodos.length * 100) : 0;
    compareLine = `【对比 ${cr.label}】学习 ${cStudyMin} 分钟、支出 ${fmtMoney(cExp)}、体重变化 ${cWdelta == null ? "无记录" : (cWdelta >= 0 ? "+" : "") + cWdelta + "kg"}、待办完成率 ${cRate}%`;
  }

  const summary = [
    `【饮食】${mealDays ? `有记录的 ${mealDays} 天，累计 ${Math.round(mKcal)} kcal，日均 ${Math.round(mKcal / Math.max(1, mealDays))} kcal；蛋白${Math.round(mP)}g 碳水${Math.round(mC)}g 脂肪${Math.round(mF)}g。常吃：${topFoods.join("、") || "无"}` : "无饮食记录"}`,
    `【身体】${weightLine}`,
    `【学习】${studyLine}`,
    `【待办】${todoLine}`,
    `【日程】${schLine}`,
    `【习惯】${habitsLine}`,
    `【记账】${moneyLine}`,
    compareLine ? compareLine : "",
  ].filter(Boolean).join("\n");

  return `你是一位贴身生活教练，理性、务实、像朋友。以下是用户「${label}」（${from} ~ ${to}，共 ${totalDays} 天）在个人工作台里记录的各项数据汇总（已脱敏，仅含统计数字与标题，不含隐私明文）：

${summary}

请基于以上数据，用中文输出：
1. 这段时间的整体画像（做了什么、坚持得怎么样）；
2. 做得好的地方（具体、基于数据）；
3. 需要警惕或改进的地方（饮食/身体/学习/待办/习惯，挑 2-3 个重点）；
4. 对接下来几天的具体、可执行的建议（尽量量化，例如每天多走多少步、学习怎么安排、饮食怎么调整）。
要求：用清晰的标题与分点，控制在 450 字以内，语气务实像朋友，不要空洞鼓励。
${aiMemoryContext()}`;
}

function mdLite(src) {
  if (!src) return "";
  const esc2 = (x) => String(x).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const lines = esc2(src).split(/\r?\n/);
  let html = "", listOpen = false, listType = "";
  const closeList = () => { if (listOpen) { html += listType === "ol" ? "</ol>" : "</ul>"; listOpen = false; listType = ""; } };
  for (const raw of lines) {
    let line = raw;
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { closeList(); const lvl = m[1].length + 2; html += `<h${lvl}>${m[2]}</h${lvl}>`; continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (!listOpen || listType !== "ul") { closeList(); html += "<ul>"; listOpen = true; listType = "ul"; }
      html += `<li>${m[1]}</li>`; continue;
    }
    if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (!listOpen || listType !== "ol") { closeList(); html += "<ol>"; listOpen = true; listType = "ol"; }
      html += `<li>${m[1]}</li>`; continue;
    }
    line = line.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    closeList();
    html += line.trim() ? `<p>${line}</p>` : "";
  }
  closeList();
  return html;
}

function renderReview() {
  if (!aiReady()) {
    $("#sec-review").innerHTML = `
    <div class="card" style="max-width:560px;margin:0 auto">
      <h3>🧠 AI 复盘</h3>
      <div style="font-size:13px;color:var(--text2);line-height:1.9;margin:10px 0">
        这个功能需要先在「设置 / 同步」里配置一个 AI 接口（任意兼容 OpenAI 的 Base URL + Key + 模型名）。配置好后，AI 会读取你过去一段时间的饮食、身体、学习、待办、习惯等记录，给出复盘与建议。
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="go('settings')">⚙️ 去配置 AI</button>
        <button class="btn ghost" onclick="showSetupGuide('ai')">📖 图文指引</button>
      </div>
    </div>`;
    return;
  }
  const tabs = [["yesterday", "昨日"], ["7d", "近 7 天"], ["30d", "近 30 天"], ["month", "本月"], ["lastmonth", "上月"]];
  $("#sec-review").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <h3>🧠 AI 复盘 · 让 AI 替你总结与思考</h3>
    <div class="sub" style="margin:8px 0 12px">选一段时期，AI 会读取你这段时间的饮食 / 身体变化 / 学习打卡 / 待办 / 习惯 / 记账，给出整体画像、亮点、风险与后续几天的可执行建议。</div>
    ${weekSummaryHtml()}
    <div style="display:flex;gap:8px;flex-wrap:wrap" id="review-tabs">
      ${tabs.map(([k, n]) => `<button class="btn sm ${reviewKind === k ? "" : "gray"}" onclick="reviewKind='${k}';renderReview()">${n}</button>`).join("")}
    </div>
    <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" id="review-run" onclick="runReview()">🤖 生成复盘</button>
      <button class="btn ghost" onclick="reviewKind='lastmonth';renderReview();setTimeout(runReview,60)">📅 一键生成上月复盘</button>
      <button class="btn ghost" onclick="reviewKind='month';renderReview();setTimeout(runReview,60)">📆 一键生成本月复盘</button>
    </div>
    <div style="font-size:12px;color:var(--text2);margin-top:8px">提示：可配置自动化，让工作台每周一早晨自动生成上周复盘（设置里「自动化」）。</div>
  </div>
  <div id="review-result"></div>`;
}
async function runReview() {
  if (!aiReady()) { toast("请先配置 AI 接口"); go("settings"); return; }
  const box = $("#review-result"); if (!box) return;
  box.innerHTML = '<div class="empty">🤖 AI 正在读取你的记录并思考，请稍候…</div>';
  const btn = $("#review-run"); if (btn) btn.disabled = true;
  try {
    const txt = await aiChat(buildReviewPrompt(reviewKind), { temperature: 0.5 });
    lastReviewTxt = txt;
    box.innerHTML = `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <h3>🧠 ${reviewRange(reviewKind).label} 复盘</h3>
        <div style="display:flex;gap:8px">
          <button class="btn sm ghost" onclick="copyText(${jsStr(txt)})">📋 复制</button>
          <button class="btn sm" onclick="saveReviewToPlan()">📝 存入今日计划</button>
        </div>
      </div>
      <div class="md">${mdLite(txt)}</div>
    </div>`;
  } catch (e) {
    box.innerHTML = '<div class="empty">AI 复盘失败：' + esc(e.message) + '（检查 AI 配置或换个说法重试）</div>';
  } finally { if (btn) btn.disabled = false; }
}
function saveReviewToPlan() {
  if (!lastReviewTxt) return toast("还没有可保存的复盘，请先生成");
  const t = todayStr();
  const cur = D.plans.daily[t] || "";
  D.plans.daily[t] = (cur ? cur + "\n\n" : "") + "【AI 复盘建议 · " + reviewRange(reviewKind).label + "】\n" + lastReviewTxt;
  save(true); toast("已存入今日计划 📝");
}

/* ================= 小工具 ================= */
let activeTool = "";
const TOOL_DEFS = [
  { id:"lottery",   cat:"🎯 随机决策", name:"抽签",      ico:"🎲", desc:"从自定义列表中随机抽取" },
  { id:"wheel",     cat:"🎯 随机决策", name:"幸运转盘",    ico:"🎡", desc:"转动转盘做决定" },
  { id:"dice",      cat:"🎯 随机决策", name:"骰子",       ico:"🎲", desc:"掷骰子决定" },
  { id:"coin",      cat:"🎯 随机决策", name:"抛硬币",     ico:"🪙", desc:"正面或反面" },
  { id:"decide",    cat:"🎯 随机决策", name:"决策器",     ico:"🎯", desc:"是 / 否 / 也许" },
  { id:"timescreen",cat:"⏱️ 时间工具", name:"时间屏幕",   ico:"⏰", desc:"全屏时钟展示" },
  { id:"stopwatch", cat:"⏱️ 时间工具", name:"秒表",       ico:"⏱️", desc:"计时 / 计圈" },
  { id:"countdown", cat:"⏱️ 时间工具", name:"快速倒计时", ico:"⏳", desc:"设定时间倒计时" },
  { id:"pomodoro",  cat:"⏱️ 时间工具", name:"番茄钟",     ico:"🍅", desc:"25+5 番茄工作法" },
  { id:"scoreboard",cat:"📊 效率工具", name:"记分牌",     ico:"📊", desc:"双方比分计数" },
  { id:"led",       cat:"📊 效率工具", name:"手持弹幕",   ico:"✋", desc:"滚动 LED 文字" },
  { id:"calc",      cat:"📊 效率工具", name:"计算器",     ico:"🔢", desc:"基础计算器" },
  { id:"passwd",    cat:"📊 效率工具", name:"密码生成器", ico:"🔐", desc:"生成安全随机密码" },
  { id:"colorpick", cat:"🔧 实用工具", name:"取色器",     ico:"🎨", desc:"拾取 / 生成颜色" },
  { id:"unit",      cat:"🔧 实用工具", name:"单位换算",   ico:"📏", desc:"长度/重量/温度等" },
  { id:"texttool",  cat:"🔧 实用工具", name:"文字工具",   ico:"🔤", desc:"Base64/大小写/哈希" },
  { id:"deviceinfo",cat:"🔧 实用工具", name:"设备信息",   ico:"📱", desc:"浏览器与系统信息" },
  { id:"bmi",       cat:"🔧 实用工具", name:"BMI 计算器",ico:"⚖️", desc:"身高体重算 BMI" },
  { id:"qrcode",    cat:"🔧 实用工具", name:"二维码生成", ico:"🔳", desc:"纯本地生成二维码" },
  { id:"noise",     cat:"⏱️ 时间工具", name:"专注白噪音",  ico:"🔊", desc:"白/粉/棕噪音助专注" },
  { id:"anniversary",cat:"⏱️ 时间工具",name:"生日倒数",   ico:"🎂", desc:"纪念日还有多久" },
];

/* --- 工具状态 --- */
let swState = { running:false, base:0, laps:[], timer:null };
let cdState = { total:0, left:0, running:false, timer:null };
let pomState = { phase:"work", left:1500, running:false, timer:null, rounds:0 };
let sbState = { a:0, b:0 };
let ledState = { text:"", speed:3, color:"#ff3333", bg:"#000" };
let calcState = { expr:"", lastResult:"" };

function renderTools() {
  const cats = [...new Set(TOOL_DEFS.map(t=>t.cat))];
  let html = `<div class="tools-page">`;
  html += `<div class="tools-intro">🛠️ 随手可用的轻量小工具，无需安装任何 App</div>`;
  for (const c of cats) {
    html += `<div class="tools-cat"><div class="tools-cat-title">${c}</div><div class="tools-grid">`;
    for (const t of TOOL_DEFS.filter(x=>x.cat===c)) {
      html += `<button class="tool-card${activeTool===t.id?" active":""}" onclick="openTool('${t.id}')">
        <span class="tool-ico">${t.ico}</span>
        <span class="tool-name">${t.name}</span>
        <span class="tool-desc">${t.desc}</span>
      </button>`;
    }
    html += `</div></div>`;
  }
  html += `<div id="tool-panel" class="tool-panel"${activeTool?">":` style="display:none">`}</div>`;
  html += `</div>`;
  $("#sec-tools").innerHTML = html;
  if (activeTool) openTool(activeTool, true);
}

function openTool(id, skipRender) {
  activeTool = id;
  if (!skipRender) renderTools();
  const panel = $("#tool-panel");
  panel.style.display = "";
  panel.scrollIntoView({ behavior:"smooth", block:"start" });
  switch(id) {
    case "lottery": panel.innerHTML = renderLottery(); break;
    case "wheel":   panel.innerHTML = renderWheel(); break;
    case "dice":    panel.innerHTML = renderDice(); break;
    case "coin":    panel.innerHTML = renderCoin(); break;
    case "decide":  panel.innerHTML = renderDecide(); break;
    case "timescreen": panel.innerHTML = renderTimeScreen(); startTimeScreen(); break;
    case "stopwatch": panel.innerHTML = renderStopwatch(); break;
    case "countdown": panel.innerHTML = renderCountdown(); break;
    case "pomodoro":  panel.innerHTML = renderPomodoro(); break;
    case "scoreboard":panel.innerHTML=renderScoreboard();break;
    case "led":      panel.innerHTML = renderLed(); break;
    case "calc":     panel.innerHTML = renderCalc(); break;
    case "passwd":   panel.innerHTML = renderPasswd(); break;
    case "colorpick":panel.innerHTML=renderColorPick();break;
    case "unit":     panel.innerHTML = renderUnit(); break;
    case "texttool": panel.innerHTML = renderTextTool(); break;
    case "deviceinfo":panel.innerHTML=renderDeviceInfo();break;
    case "bmi":        panel.innerHTML = renderBmi(); break;
    case "qrcode":     panel.innerHTML = renderQrcode(); break;
    case "noise":      panel.innerHTML = renderNoise(); break;
    case "anniversary":panel.innerHTML = renderAnniversary(); break;
  }
}

/* ===== 1. 抽签 ===== */
function renderLottery() {
  const items = (D._lotteryItems||["选项 A","选项 B","选项 C","选项 D"]).join("\n");
  return `<div class="tool-body"><h3>🎲 抽签</h3><p class="tool-sub">每行一个选项，随机抽取一个</p>
    <textarea id="lot-items" rows="6" placeholder="每行一个选项...">${esc(items)}</textarea>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="btn" onclick="doLottery()">🎯 开始抽签</button>
      <button class="btn gray sm" onclick="saveLotteryItems()">💾 保存选项</button>
    </div>
    <div id="lot-result" class="tool-result"></div></div>`;
}
function doLottery() {
  const raw = $("#lot-items").value.trim();
  if (!raw) return toast("请先输入选项");
  const items = raw.split("\n").map(s=>s.trim()).filter(Boolean);
  if (items.length < 2) return toast("至少需要 2 个选项");
  // 动画：快速轮换后停下
  const el = $("#lot-result");
  let rounds = 0, maxRounds = 12 + Math.floor(Math.random()*8);
  el.style.display="block"; el.innerHTML=`<div class="lot-animate">${esc(items[Math.floor(Math.random()*items.length)])}</div>`;
  const iv = setInterval(()=>{
    el.innerHTML=`<div class="lot-animate">${esc(items[Math.floor(Math.random()*items.length)])}</div>`;
    rounds++; if (rounds >= maxRounds) { clearInterval(iv);
      const winner = items[Math.floor(Math.random()*items.length)];
      el.innerHTML=`<div class="lot-winner">🎉 ${esc(winner)}</div>`;
      navigator.vibrate && navigator.vibrate([100,50,100]);
    }
  }, 60 + rounds*15);
}
function saveLotteryItems() { D._lotteryItems = $("#lot-items").value.split("\n").map(s=>s.trim()).filter(Boolean); save(true); toast("已保存"); }

/* ===== 2. 幸运转盘 ===== */
function renderWheel() {
  const items = (D._wheelItems||["吃饭","睡觉","打游戏","学习","运动","看电影"]).join("\n");
  return `<div class="tool-body"><h3>🎡 幸运转盘</h3><p class="tool-sub">每行一个选项，转动转盘决定命运</p>
    <textarea id="wh-items" rows="5" placeholder="每行一个选项...">${esc(items)}</textarea>
    <div style="margin:16px auto;max-width:320px;text-align:center">
      <svg id="wh-svg" viewBox="0 0 300 300" width="280" height="280" style="max-width:100%"></svg>
      <div id="wh-pointer" style="position:relative;top:-180px;font-size:36px;z-index:2">▼</div>
    </div>
    <button class="btn" onclick="spinWheel()" id="wh-btn">🎡 开始旋转</button>
    <div id="wh-result" class="tool-result"></div></div>`;
}
function drawWheel(items) {
  const svg = $("#wh-svg"); if (!svg) return;
  const n = Math.max(2, items.length); const arc = 2*Math.PI/n; const r=140, cx=150, cy=150;
  const palette = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F","#BB8FCE","#85C1E9","#F1948A","#82E0AA"];
  let html = "";
  for (let i=0;i<n;i++) {
    const a1=i*arc-Math.PI/2, a2=(i+1)*arc-Math.PI/2;
    const x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1);
    const x2=cx+r*Math.cos(a2), y2=cy+r*Math.sin(a2);
    const la = arc > Math.PI ? 1 : 0;
    html += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${la},1 ${x2},${y2} Z" fill="${palette[i%palette.length]}" stroke="#fff" stroke-width="1.5"/>`;
    const ta=i*arc+arc/2-Math.PI/2, tx=cx+(r-35)*Math.cos(ta), ty=cy+(r-35)*Math.sin(ta);
    html += `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="12" font-weight="bold" transform="rotate(${ta*180/Math.PI+90},${tx},${ty})">${esc(items[i].slice(0,6))}</text>`;
  }
  svg.innerHTML = html + `<circle cx="${cx}" cy="${cy}" r="22" fill="#fff" stroke="#ddd" stroke-width="2"/><text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="14" fill="#333">SPIN</text>`;
}
function spinWheel() {
  const raw = $("#wh-items").value.trim();
  if (!raw) return toast("请输入选项");
  const items = raw.split("\n").map(s=>s.trim()).filter(Boolean);
  D._wheelItems = items; save(true);
  drawWheel(items);
  const btn=$("#wh-btn"); btn.disabled=true;
  const spins = 5+Math.random()*4, duration=3500+Math.random()*1500;
  const svg=$("#wh-svg"); const start=performance.now();
  function frame(now) {
    const t=Math.min((now-start)/duration,1); const ease=1-Math.pow(1-t,3);
    const rot=spins*360*ease*(Math.PI/180);
    svg.setAttribute("transform",`rotate(${rot*180/Math.PI},150,150)`);
    if (t<1) requestAnimationFrame(frame); else {
      btn.disabled=false;
      const finalRot=spins*360%360; const n=items.length;
      const idx=((360-finalRot)%360/(360/n)|0)%n;
      $("#wh-result").innerHTML=`<div class="lot-winner">🎡 ${esc(items[idx])}</div>`;
      navigator.vibrate&&navigator.vibrate([150,50,150]);
    }
  }
  requestAnimationFrame(frame);
}

/* ===== 3. 骰子 ===== */
function renderDice() {
  return `<div class="tool-body"><h3>🎲 骰子</h3>
    <div class="dice-area">
      <div class="dice" id="d1" onclick="rollDice(1)">?</div>
      <div class="dice" id="d2" onclick="rollDice(2)">?</div>
      <div class="dice" id="d3" onclick="rollDice(3)">?</div>
      <div class="dice" id="d4" onclick="rollDice(4)">?</div>
      <div class="dice" id="d5" onclick="rollDice(5)">?</div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn" onclick="rollAllDice()">🎲 掷全部（5颗）</button>
      <select id="dice-count" class="inp" style="width:auto"><option value="1">1颗</option><option value="2">2颗</option><option value="3" selected>3颗</option><option value="4">4颗</option><option value="5">5颗</option></select>
      <button class="btn gray sm" onclick="rollNDice()">掷 N 颗</button>
    </div>
    <div id="dice-total" class="tool-result"></div></div>`;
}
const diceDots = [[],[[50]],[[20,80]],[[20,50,80]],[[20,20,80,80]],[[20,20,50,80,80]],[[20,20,20,80,50,80]]];
function showDice(el, val) {
  const dots=diceDots[val]||[];
  el.textContent="";
  el.setAttribute("data-val",val);
  dots.forEach(g=>{const d=document.createElement("div");d.className="dot";d.style.left=g+"%";d.style.top=g+"%";el.appendChild(d);});
  el.classList.add("rolled");
}
function rollDice(i){const v=1|Math.random()*6;showDice($("#d"+i),v);}
function rollAllDice(){for(let i=1;i<=5;i++)rollDice(i);updateDiceTotal();}
function rollNDice(){const n=+$("#dice-count").value;for(let i=1;i<=5;i++){i<=n?rollDice(i):($("#d"+i).textContent="",$("#d"+i).classList.remove("rolled"),$("#d"+i).setAttribute("data-val",""));}updateDiceTotal();}
function updateDiceTotal(){let s=0,c=0;for(let i=1;i<=5;i++){const v=+($("#d"+i)||{}).getAttribute("data-val");if(v){s+=v;c++;}}$("#dice-total").innerHTML=c?`<div>共 ${c} 颗骰子，点数合计：<b>${s}</b></div>`:"";}

/* ===== 4. 抛硬币 ===== */
function renderCoin() {
  return `<div class="tool-body"><h3>🪙 抛硬币</h3>
    <div id="coin-box" class="coin-box" onclick="flipCoin()">
      <div id="coin-el" class="coin-el">?</div>
    </div>
    <p class="tool-sub" style="text-align:center">点击硬币抛出</p>
    <div id="coin-result" class="tool-result"></div>
    <div id="coin-stats" style="margin-top:8px;font-size:13px;color:#666"></div></div>`;
}
let coinStats={h:0,t:0};
function flipCoin(){
  const el=$("#coin-el");const box=$("#coin-box");
  el.className="coin-el flipping";el.textContent="?";
  $("#coin-result").style.display="none";
  setTimeout(()=>{const h=!!(Math.random()<0.5);h?coinStats.h++:coinStats.t++;
    el.className="coin-el "+(h?"heads":"tails");el.textContent(h?"正":"反");
    $("#coin-result").innerHTML=`<div class="lot-winner">${h?"🟢 正面 Heads":"🔴 反面 Tails"}</div>`;$("#coin-result").style.display="block";
    $("#coin-stats").textContent=`统计：正面 ${coinStats.h} 次 | 反面 ${coinStats.t} 次`;
    navigator.vibrate&&navigator.vibrate(80);
  }, 900);
}

/* ===== 5. 决策器 ===== */
function renderDecide() {
  return `<div class="tool-body"><h3>🎯 决策器</h3><p class="tool-sub">无法决定？让命运告诉你</p>
    <div class="decide-options">
      <button class="decide-btn" onclick="doDecide('yes')">✅ 是 / 去做</button>
      <button class="decide-btn" onclick="doDecide('no')">❌ 不 / 别做</button>
      <button class="decide-btn" onclick="doDecide('maybe')">🤔 再想想</button>
      <button class="decide-btn decide-big" onclick="doDecide(null)">🎲 全随机</button>
    </div>
    <div id="decide-result" class="tool-result"></div>
    <div style="margin-top:14px">
      <input id="decide-q" class="inp" placeholder="输入你的问题（可选）..." style="width:100%;box-sizing:border-box"/>
      <button class="btn" style="margin-top:8px;width:100%" onclick="doDecide(null)">🎯 给我答案</button>
    </div></div>`;
}
function doDecide(force){
  const opts=["✅ 是的，去做吧！","❌ 不，别做。","🤔 再想想，时机未到。","💪 相信直觉，冲！","🛑 冷静一下再说。","⭐ 星象说：可以一试。","🌙 今晚不适合。"];
  const ans=force==="yes"?opts[0]:force==="no"?opts[1]:force==="maybe"?opts[2]:opts[3+(Math.random()*opts.length-3|0)];
  const q=$("#decide-q")?.value?.trim();
  $("#decide-result").innerHTML=`<div class="lot-winner" style="padding:20px">${q?`<div style="font-size:13px;color:#888;margin-bottom:8px">问题：${esc(q)}</div>`:""}<div style="font-size:22px">${ans}</div></div>`;
  navigator.vibrate&&navigator.vibrate([60,40,60]);
}

/* ===== 6. 时间屏幕 ===== */
let tsTimer=null;
function renderTimeScreen() {
  return `<div class="tool-body timescreen-body"><h3>⏰ 时间屏幕</h3>
    <div id="ts-clock" class="ts-clock">--:--:--</div>
    <div id="ts-date" class="ts-date"></div>
    <div class="ts-formats">
      <button class="ts-fmt active" onclick="setTsFormat(this,'full')" data-fmt="full">完整</button>
      <button class="ts-fmt" onclick="setTsFormat(this,'simple')" data-fmt="simple">简洁</button>
      <button class="ts-fmt" onclick="setTsFormat(this,'sec')" data-fmt="sec">带秒</button>
      <button class="ts-fmt" onclick="toggleTsFullscreen()" id="ts-fs-btn">⛶ 全屏</button>
    </div></div>`;
}
function startTimeScreen() {
  stopTimeScreen();
  tsTimer=setInterval(updateTsClock,1000); updateTsClock();
}
function stopTimeScreen(){if(tsTimer){clearInterval(tsTimer);tsTimer=null;}}
function updateTsClock() {
  const now=new Date(), h=String(now.getHours()).padStart(2,"0"),
    m=String(now.getMinutes()).padStart(2,"0"), s=String(now.getSeconds()).padStart(2,"0");
  const fmt=$(".ts-fmt.active")?.dataset?.fmt||"full";
  const el=$("#ts-clock"); const de=$("#ts-date");
  if (!el) return;
  if (fmt==="simple") el.textContent=h+":"+m;
  else if (fmt==="sec") el.textContent=h+":"+m+":"+s;
  else el.textContent=h+":"+m+":"+s;
  de.textContent=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} 周${"日一二三四五六"[now.getDay()]}`;
}
function setTsFormat(el,fmt){document.querySelectorAll(".ts-fmt").forEach(b=>b.classList.remove("active"));el.classList.add("active");updateTsClock();}
function toggleTsFullscreen(){
  const body=$(".timescreen-body");
  const btn=$("#ts-fs-btn");
  if (!body.classList.contains("fs")){body.classList.add("fs");btn.textContent="⬜ 退出全屏";
    try{document.documentElement.requestFullscreen?.();}catch(e){}
  } else{body.classList.remove("fs");btn.textContent="⛶ 全屏";
    try{document.exitFullscreen?.();}catch(e){}
  }
}

/* ===== 7. 秒表 ===== */
function renderStopwatch() {
  const lapsHtml=swState.laps.map((l,i)=>`<div class="sw-lap">#${i+1}  ${formatSw(l)}  <small>(差 +${i?formatSw(swState.laps[i]-swState.laps[i-1]):formatSw(l)})</small></div>`).reverse().join("");
  return `<div class="tool-body"><h3>⏱️ 秒表</h3>
    <div class="sw-display">${swState.running?formatSw(performance.now()-swState.base):formatSw(swState.base)}</div>
    <div class="sw-laps" id="sw-laps">${lapsHtml||"<small style='color:#999'>暂无计圈记录</small>"}</div>
    <div class="sw-controls">
      <button class="btn" id="sw-toggle" onclick="toggleSw()">${swState.running?"⏸ 暂停":"▶ 开始"}</button>
      <button class="btn gray" id="sw-lap" onclick="lapSw()" ${!swState.running?"disabled":""}>🏁 计圈</button>
      <button class="btn gray" onclick="resetSw()">🔄 重置</button>
    </div></div>`;
}
function formatSw(ms){ms=Math.max(0,ms|0);const s=ms/1000,m=s/60|0,sec=s%60|0,cs=(ms%1000/10|0);return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0")+"."+String(cs).padStart(2,"0");}
function toggleSw(){
  if (swState.running){swState.running=false;clearInterval(swState.timer);swState.timer=null;
    swState.base=performance.now()-swState.base;
  } else {swState.running=true;swState.base=performance.now()-swState.base;
    swState.timer=setInterval(()=>{$("#sec-tools").querySelector(".sw-display")&&( $(".sw-display").textContent=formatSw(performance.now()-swState.base)); },30);
  } openTool("stopwatch",true);
}
function lapSw(){if(!swState.running)return;swState.laps.push(performance.now()-swState.base);openTool("stopwatch",true);}
function resetSw(){swState={running:false,base:0,laps:[],timer:null};clearInterval(swState.timer);openTool("stopwatch",true);}

/* ===== 8. 快速倒计时 ===== */
function renderCountdown() {
  const m=Math.floor(cdState.total/60),s=cdState.total%60;
  return `<div class="tool-body"><h3>⏳ 快速倒计时</h3>
    <div class="cd-display">${formatCd(cdState.left||cdState.total)}</div>
    ${!cdState.running&&!cdState.left?`<div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">
      <input type="number" id="cd-min" class="inp" value="5" min="0" max="99" style="width:70px;text-align:center"/> 分
      <input type="number" id="cd-sec" class="inp" value="0" min="0" max="59" style="width:70px;text-align:center"/> 秒
    </div>`:""}
    <div class="sw-controls">
      <button class="btn" id="cd-toggle" onclick="toggleCd()">${cdState.running?"⏸ 暂停":(cdState.left?"▶ 继续":"▶ 开始倒计时")}</button>
      <button class="btn gray" onclick="resetCd()">🔄 重置</button>
      <div style="display:flex;gap:4px;margin-top:8px;justify-content:center">
        ${[1,3,5,10,15,20,30].map(n=>`<button class="btn sm gray" onclick="setCdPreset(${n})">${n}分</button>`).join("")}
      </div>
    </div></div>`;
}
function formatCd(s){s=Math.max(0,s|0);const m=s/60|0,sec=s%60;return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");}
function toggleCd(){
  if (cdState.running){cdState.running=false;clearInterval(cdState.timer);cdState.timer=null;}
  else {if(!cdState.total&&!cdState.left){const m=+$("#cd-min").value||0,s=+$("#cd-sec").value||0;cdState.total=m*60+s;}
    if (!cdState.total&&!cdState.left) return toast("请设置时间");
    if (!cdState.left) cdState.left=cdState.total;
    cdState.running=true;cdState.timer=setInterval(()=>{
      cdState.left--;const el=$(".cd-display");if(el)el.textContent=formatCd(cdState.left);
      if (cdState.left<=0){clearInterval(cdState.timer);cdState.running=false;cdState.timer=null;
        try{new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQAAEVlSVeHh4eHh4eHh4eHh4eHh4eHh4eA==").play().catch(()=>{});}catch(e){}
        toast("⏰ 时间到！");navigator.vibrate&&navigator.vibrate([200,100,200]);openTool("countdown",true);
      }
    },1000);
  } openTool("countdown",true);
}
function resetCd(){clearInterval(cdState.timer);cdState={total:0,left:0,running:false,timer:null};openTool("countdown",true);}
function setCdPreset(min){resetCd();cdState.total=min*60;cdState.left=min*60;openTool("countdown",true);}

/* ===== 9. 番茄钟 ===== */
function renderPomodoro() {
  const m=Math.floor(pomState.left/60),s=pomState.left%60;
  return `<div class="tool-body"><h3>🍅 番茄钟</h3>
    <div class="pomodoro-phase">${pomState.phase==="work"?"🍅 专注中":"☕ 休息中"}</div>
    <div class="cd-display pomodoro-display">${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}</div>
    <div style="color:#888;font-size:13px">已完成 ${pomState.rounds} 个番茄</div>
    <div class="sw-controls">
      <button class="btn" id="pom-toggle" onclick="togglePomodoro()">${pomState.running?"⏸ 暂停":(pomState.left<(pomState.phase==="work"?1500:300)?"▶ 继续":"▶ 开始")}</button>
      <button class="btn gray" onclick="resetPomodoro()">🔄 重置</button>
      <button class="btn gray" onclick="skipPomodoro()">⏭ 跳过</button>
    </div></div>`;
}
function togglePomodoro(){
  if (pomState.running){pomState.running=false;clearInterval(pomState.timer);pomState.timer=null;}
  else {if (pomState.left>=1500)pomState.phase="work";else if (pomState.left>=300||pomState.left===0){pomState.phase="work";pomState.left=1500;} pomState.running=true;
    pomState.timer=setInterval(()=>{
      pomState.left--;const el=$(".pomodoro-display");if(el){const m=Math.floor(pomState.left/60),s=pomState.left%60;el.textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");}
      if (pomState.left<=0){clearInterval(pomState.timer);pomState.running=false;pomState.timer=null;
        if (pomState.phase==="work"){toast("☕ 休息一下吧！");pomState.rounds++;pomState.phase="break";pomState.left=300;}
        else {toast("🍅 休息结束！");pomState.phase="work";pomState.left=1500;}
        navigator.vibrate&&navigator.vibrate([150,80,150]);openTool("pomodoro",true);
      }
    },1000);
  } openTool("pomodoro",true);
}
function resetPomodoro(){clearInterval(pomState.timer);pomState={phase:"work",left:1500,running:false,timer:null,rounds:pomState.rounds};openTool("pomodoro",true);}
function skipPomodoro(){clearInterval(pomState.timer);pomState.running=false;pomState.timer=null;
  if (pomState.phase==="work"){pomState.phase="break";pomState.left=300;}else{pomState.phase="work";pomState.left=1500;pomState.rounds++;}
  openTool("pomodoro",true);
}

/* ===== 10. 记分牌 ===== */
function renderScoreboard() {
  return `<div class="tool-body"><h3>📊 记分牌</h3>
    <div class="sb-board">
      <div class="sb-team"><div class="sb-label">队伍 A</div><div class="sb-score" id="sb-a">${sbState.a}</div>
        <div class="sb-btns"><button class="btn sm" onclick="sbAdd('a',1)">+1</button><button class="btn sm" onclick="sbAdd('a',-1)">-1</button><button class="btn sm gray" onclick="sbSet('a')">设</button></div></div>
      <div class="sb-vs">VS</div>
      <div class="sb-team"><div class="sb-label">队伍 B</div><div class="sb-score" id="sb-b">${sbState.b}</div>
        <div class="sb-btns"><button class="btn sm" onclick="sbAdd('b',1)">+1</button><button class="btn sm" onclick="sbAdd('b',-1)">-1</button><button class="btn sm gray" onclick="sbSet('b')">设</button></div></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
      <button class="btn gray" onclick="sbReset()">🔄 重置比分</button>
      <button class="btn gray" onclick="sbSwap()">🔃 交换</button>
    </div></div>`;
}
function sbAdd(team,d){sbState[team]=Math.max(0,(sbState[team]||0)+d);$("#sb-"+team).textContent=sbState[team];}
function sbSet(team){const v=prompt(`设置队伍 ${team.toUpperCase()} 分数`,sbState[team]);if(v!==null){sbState[team]=Math.max(0,+v||0);$("#sb-"+team).textContent=sbState[team];}}
function sbReset(){sbState={a:0,b:0};openTool("scoreboard",true);}
function sbSwap(){const t=sbState.a;sbState.a=sbState.b;sbState.b=t;openTool("scoreboard",true);}

/* ===== 11. 手持弹幕 ===== */
function renderLed() {
  return `<div class="tool-body"><h3>✋ 手持弹幕</h3><p class="tool-sub">像演唱会那样举着滚动文字</p>
    <input id="led-text" class="inp" value="${esc(ledState.text||"这里输入弹幕文字 ✋")}" placeholder="弹幕文字..." style="width:100%;box-sizing:border-box;margin-bottom:10px"/>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
      <label>颜色</label><input type="color" id="led-color" value="${ledState.color}" style="width:40px;height:32px;border:none;padding:0"/>
      <label>背景</label><input type="color" id="led-bg" value="${ledState.bg}" style="width:40px;height:32px;border:none;padding:0"/>
      <label>速度</label>
      <select id="led-speed" class="inp" style="width:auto"><option value="1" ${ledState.speed==1?"selected":""}>慢</option><option value="2" ${ledState.speed==2?"selected":""}>中</option><option value="3" ${ledState.speed==3?"selected":""}>快</option><option value="5" ${ledState.speed==5?"selected":""}>极快</option></select>
    </div>
    <button class="btn" onclick="startLed()" style="width:100%">▶ 显示弹幕</button>
    <div id="led-preview" class="led-preview" style="display:none"></div></div>`;
}
let ledAnimId=null;
function startLed(){
  ledState.text=$("#led-text").value||"Hello ✋";ledState.color=$("#led-color").value;ledState.bg=$("#led-bg").value;ledState.speed=+$("#led-speed").value;
  cancelAnimationFrame(ledAnimId);
  const preview=$("#led-preview");preview.style.display="block";
  preview.style.background=ledState.bg;preview.style.color=ledState.color;
  preview.textContent=ledState.text;
  preview.style.padding="18px 0";preview.style.fontSize="42px";preview.style.fontWeight="bold";
  preview.style.whiteSpace="nowrap";preview.style.overflow="hidden";preview.style.position="relative";
  let pos=preview.offsetWidth;const txtWidth=preview.scrollWidth;
  function anim(){pos-=ledState.speed*1.5;if(pos<-txtWidth)pos=preview.offsetWidth;preview.style.transform=`translateX(${pos}px)`;ledAnimId=requestAnimationFrame(anim);}
  ledAnimId=requestAnimationFrame(anim);
}

/* ===== 12. 计算器 ===== */
function renderCalc() {
  return `<div class="tool-body"><h3>🔢 计算器</h3>
    <div class="calc-display"><div id="calc-expr">${esc(calcState.expr||"")}</div><div id="calc-res">${esc(calcState.lastResult||"")}</div></div>
    <div class="calc-grid">
      ${["C","(",")","÷","7","8","9","×","4","5","6","-","1","2","3","+","0",".","±","="].map(k=>{
        const cls=k==="="?"eq":k==="C"?"clr":["÷","×","-","+"].includes(k)?"op":"num";
        return`<button class="calc-key ${cls}" onclick="calcInput('${k}')">${k}</button>`;
      }).join("")}
    </div></div>`;
}
function calcInput(key) {
  if (key==="C"){calcState.expr="";calcState.lastResult="";}
  else if (key==="="){try{
    const e=calcState.expr.replace(/×/g,"*").replace(/÷/g,"/").replace(/±/g,"-");
    const r=new Function("return "+e)();
    calcState.lastResult=Number.isFinite(r)?(r%1===0?r:r.toFixed(10).replace(/\.?0+$/,"")):"Error";
  }catch(e){calcState.lastResult="Error";}}
  else if (key==="±"){if(calcState.expr){if(calcState.expr.startsWith("-"))calcState.expr=calcState.expr.slice(1);else calcState.expr="-"+calcState.expr;}}
  else {calcState.expr+=key;}
  openTool("calc",true);
}

/* ===== 13. 密码生成器 ===== */
function renderPasswd() {
  return `<div class="tool-body"><h3>🔐 密码生成器</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
      <label>长度</label><input type="range" id="pw-len" min="6" max="64" value="20" oninput="$('#pw-len-v').textContent=this.value" style="width:120px"/><span id="pw-len-v">20</span>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">
      <label><input type="checkbox" id="pw-up" checked/> 大写 A-Z</label>
      <label><input type="checkbox" id="pw-lo" checked/> 小写 a-z</label>
      <label><input type="checkbox" id="pw-num" checked/> 数字 0-9</label>
      <label><input type="checkbox" id="pw-sym" checked/> 符号 !@#</label>
    </div>
    <button class="btn" style="width:100%" onclick="genPassword()">🔄 生成密码</button>
    <div id="pw-out" class="pw-output" style="display:none"><code id="pw-val"></code><button class="btn sm" onclick="copyText($('#pw-val').textContent)">📋 复制</button></div></div>`;
}
function genPassword(){
  let chars="";if($("#pw-up").checked)chars+="ABCDEFGHIJKLMNOPQRSTUVWXYZ";if($("#pw-lo").checked)chars+="abcdefghijklmnopqrstuvwxyz";if($("#pw-num").checked)chars+="0123456789";if($("#pw-sym").checked)chars+="!@#$%^&*()_+-=[]{}|;:,.<>?";
  if(!chars){toast("至少选一种字符类型");return;}
  const len=+$("#pw-len").value;let pw="";const ua=new Uint32Array(len);crypto.getRandomValues(ua);
  for(let i=0;i<len;i++)pw+=chars[ua[i]%chars.length];
  $("#pw-val").textContent=pw;$("#pw-out").style.display="flex";toast("已生成 "+len+" 位密码");
}

/* ===== 14. 取色器 ===== */
function renderColorPick() {
  return `<div class="tool-body"><h3>🎨 取色器</h3>
    <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
      <div><label>选择颜色</label><br/><input type="color" id="cp-color" value="#4f6ef7" style="width:80px;height:60px;padding:0"/></div>
      <div id="cp-info" style="flex:1;min-width:200px">
        <div class="cp-row"><label>HEX</label><input class="inp cp-inp" id="cp-hex" readonly/></div>
        <div class="cp-row"><label>RGB</label><input class="inp cp-inp" id="cp-rgb" readonly/></div>
        <div class="cp-row"><label>HSL</label><input class="inp cp-inp" id="cp-hsl" readonly/></div>
        <button class="btn sm" onclick="copyText($('#cp-hex').value)" style="margin-top:6px">📋 复制 HEX</button>
      </div>
    </div>
    <div style="margin-top:14px">
      <label>随机颜色</label><br/>
      <div id="cp-rand-palette" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"></div>
      <button class="btn sm gray" onclick="genPalette()" style="margin-top:6px">🎲 生成随机调色板</button>
    </div></div>`;
}
// color picker init on first open
function _initColorPick(){
  const el=$("#cp-color");if(!el||el.dataset.init)return;
  el.dataset.init="1";el.addEventListener("input",updateColorInfo);updateColorInfo();genPalette();
}
function hexToRgb(h){h=h.replace("#","");const bn=parseInt(h,16);return[(bn>>16)&255,(bn>>8)&255,bn&255];}
function rgbToHsl(r,g,B){r/=255;g/=255;B/=255;const max=Math.max(r,g,B),min=Math.min(r,g,B);let h,s,l=(max+min)/2;if(max===min){h=s=0;}else{const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=((g-B)/d+(g<B?6:0))/6;break;case g:h=((B-r)/d+2)/6;break;default:h=((r-g)/d+4)/6;break;}}return[h*360,s*100,l*100];}
function updateColorInfo(){
  const hex=$("#cp-color").value;$("#cp-hex").value=hex.toUpperCase();
  const [r,g,b]=hexToRgb(hex);$("#cp-rgb").value=`${r}, ${g}, ${b}`;
  const [h,s,l]=rgbToHsl(r,g,b);$("#cp-hsl").value=`${h.toFixed(0)}°, ${s.toFixed(0)}%, ${l.toFixed(0)}%`;
}
function genPalette(){
  const container=$("#cp-rand-palette");if(!container)return;container.innerHTML="";
  const colors=[];const ua=new Uint32Array(8);crypto.getRandomValues(ua);
  for(let i=0;i<8;i++){
    const h=ua[i]%360,s=60+ua[i]%40,l=45+ua[i]%25;
    // simple HSL-to-HEX approximation
    const c=document.createElement("div");c.style.cssText=`width:48px;height:48px;border-radius:8px;cursor:pointer;background:hsl(${h},${s}%,${l}%)`;c.title=`hsl(${h},${s}%,${l}%)`;
    c.onclick=function(){const cs=getComputedStyle(this).backgroundColor;const m=cs.match(/\d+/g);if(m){const rh=+m[0],rg=+m[1],rb=+m[2];const hx="#"+[rh,rg,rb].map(x=>x.toString(16).padStart(2,"0")).join("");$("#cp-color").value=hx;updateColorInfo();}};
    container.appendChild(c);
  }
}
// hook into openTool to init color picker
const _origOpenTool=openTool;openTool=function(id,sr){_origOpenTool(id,sr);if(id==="colorpick")setTimeout(_initColorPick,50);};

/* ===== 15. 单位换算 ===== */
function renderUnit() {
  return `<div class="tool-body"><h3>📏 单位换算</h3>
    <select id="unit-cat" class="inp" onchange="renderUnitPanel()" style="width:100%;margin-bottom:12px">
      <option value="length">📏 长度</option><option value="weight">⚖️ 重量</option><option value="temp">🌡️ 温度</option>
      <option value="area">📐 面积</option><option value="volume">🥤 体积/容量</option><option value="speed">🚀 速度</option>
      <option value="data">💾 数据存储</option><option value="time">⏱️ 时间</option>
    </select>
    <div id="unit-panel"></div></div>`;
}
const UNIT_TABLES={
  length:{units:[["米","m"],["千米","km"],["厘米","cm"],["毫米","mm"],["英寸","in"],["英尺","ft"],["码","yd"],["海里","nmi"]],base:"m"},
  weight:{units:[["千克","kg"],["克","g"],["毫克","mg"],["磅","lb"],["盎司","oz"],["吨","t"],["斤","jin"]],base:"kg"},
  temp:{units:[["摄氏度","°C"],["华氏度","°F"],["开尔文","K"]],isTemp:true},
  area:{units:[["平方米","m²"],["平方千米","km²"],["公顷","ha"],["亩","mu"],["平方英尺","ft²"],["平方英寸","in²"]],base:"m²"},
  volume:{units:[["升","L"],["毫升","mL"],["立方米","m³"],["加仑(美)","gal"],["杯","cup"]],base:"L"},
  speed:{units:[["米/秒","m/s"],["千米/时","km/h"],["英里/时","mph"],["节","kn"]],base:"m/s"},
  data:{units:[["字节","B"],["KB","KB"],["MB","MB"],["GB","GB"],["TB","TB"]],base:"B"},
  time:{units:[["秒","s"],["分钟","min"],["小时","h"],["天","d"],["周","w"],["月","mo"],["年","y"]],base:"s"},
};
// conversion factors to base unit
const UNIT_FACTOR={
  m:{m:1,km:1000,cm:.01,mm:.001,in:.0254,ft:.3048,yd:.9144,nmi:1852},
  kg:{kg:1,g:.001,mg:.000001,lb:.453592,oz:.0283495,t:1000,jin:.5},
  ha:{"m²":1,"km²":1e6,ha:1e4,mu:666.67,"ft²":.092903,"in²":.00064516},
  L:{"L":1,mL:.001,"m³":1000,gal:3.78541,cup:.236588},
  "m/s":{"m/s":1,"km/h":.277778,mph:.44704,kn:.514444},
  B:{B:1,KB:1024,MB:1048576,GB:1073741824,TB:1099511627776},
  s:{s:1,min:60,h:3600,d:86400,w:604800,mo:2592000,y:31536000},
};
function renderUnitPanel(){
  const cat=$("#unit-cat").value;const table=UNIT_TABLES[cat];const panel=$("#unit-panel");
  if (!table){panel.innerHTML="";return;}
  const us=table.units;
  panel.innerHTML=`<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
    <input type="number" id="unit-val" class="inp" value="1" step="any" style="width:120px"/>
    <select id="unit-from" class="inp" style="width:auto">${us.map(([n])=>`<option>${n}</option>`).join("")}</select>
    <span>→</span>
    <select id="unit-to" class="inp" style="width:auto">${us.map(([n])=>`<option>${n}</option>`).join("")}</select>
  </div>
  <div id="unit-res" class="tool-result"></div>
  <button class="btn" onclick="doConvert()" style="width:100%">🔄 换算</button>`;
  // default to!=from
  if(us.length>1)$("#unit-to").selectedIndex=1;
  doConvert();
}
function doConvert(){
  const cat=$("#unit-cat").value;const table=UNIT_TABLES[cat];if(!table)return;
  const val=parseFloat($("#unit-val").value)||0;const from=$("#unit-from").value;const to=$("#unit-to").value;
  let result;
  if (table.isTemp) { result=convertTemp(val,from,to); }
  else { const factors=UNIT_FACTOR[table.base]; if(!factors)return; const f=factors[from]||1, t=factors[to]||1; result=val*f/t; }
  const fmt=result%1===0?result:result.toPrecision(6).replace(/\.?0+$/,"");
  $("#unit-res").innerHTML=`<div><b>${val}</b> ${from} = <b>${fmt}</b> ${to}</div>`;
}
function convertTemp(val,from,to){
  let c;if(from==="摄氏度"||from==="°C")c=val;else if(from==="华氏度"||from==="°F")c=(val-32)*5/9;else c=val-273.15;
  if(to==="摄氏度"||to==="°C")return c;if(to==="华氏度"||to==="°F")return c*9/5+32;return c+273.15;
}

/* ===== 16. 文字工具 ===== */
function renderTextTool() {
  return `<div class="tool-body"><h3>🔤 文字工具</h3>
    <textarea id="tt-input" rows="4" class="inp" placeholder="在此输入文字..." style="width:100%;box-sizing:border-box"></textarea>
    <div class="tt-btns" style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">
      <button class="btn sm" onclick="ttOp('upper')">大写</button>
      <button class="btn sm" onclick="ttOp('lower')">小写</button>
      <button class="btn sm" onclick="ttOp('title')">首字母大写</button>
      <button class="btn sm" onclick="ttOp('reverse')">反转</button>
      <button class="btn sm" onclick="ttOp('b64enc')">Base64 编</button>
      <button class="btn sm" onclick="ttOp('b64dec')">Base64 解</button>
      <button class="btn sm" onclick="ttOp('hash')">简单哈希</button>
      <button class="btn sm" onclick="ttOp('lines')">去空行</button>
      <button class="btn sm" onclick="ttOp('sort')">排序</button>
      <button class="btn sm" onclick="ttOp('dedup')">去重</button>
      <button class="btn sm" onclick="ttOp('len')">字数统计</button>
    </div>
    <div id="tt-out" class="tool-result" style="display:none"><pre id="tt-out-txt" style="white-space:pre-wrap;word-break:break-all"></pre>
    <button class="btn sm" onclick="copyText($('#tt-out-txt').textContent)">📋 复制结果</button></div></div>`;
}
function ttOp(op){
  let s=$("#tt-input").value;const out=$("#tt-out");const txt=$("#tt-out-txt");
  switch(op){
    case "upper":s=s.toUpperCase();break;
    case "lower":s=s.toLowerCase();break;
    case "title":s=s.replace(/\b\w/g,ch=>ch.toUpperCase());break;
    case "reverse":s=s.split("").reverse().join("");break;
    case "b64enc":try{s=btoa(unescape(encodeURIComponent(s)));}catch(e){s="编码失败";}break;
    case "b64dec":try{s=decodeURIComponent(escape(atob(s.trim())));}catch(e){s="解码失败（不是有效的 Base64）";}break;
    case "hash":{let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}s="Hash: "+(h>>>0).toString(16);break;}
    case "lines":s=s.replace(/\n\s*\n/g,"\n").replace(/^\s+|\s+$/g,"");break;
    case "sort":s=s.split("\n").filter(Boolean).sort().join("\n");break;
    case "dedup":s=[...new Set(s.split("\n"))].filter(Boolean).join("\n");break;
    case "len":{const c=[...s].length,noSpace=s.replace(/\s/g,"").length,line=s.split("\n").length,word=s.split(/\s+/).filter(Boolean).length;
      s=`字符数：${c}\n不含空白：${noSpace}\n行数：${line}\n词数：${word}`;break;}
  }
  txt.textContent=s;out.style.display="block";
}

/* ===== 17. 设备信息 ===== */
function renderDeviceInfo() {
  const ua=navigator.userAgent;
  const info={
    "平台":navigator.platform||"-",
    "用户代理":ua.length>120?ua.slice(0,120)+"...":ua,
    "语言":navigator.language||"-",
    "在线":navigator.onLine?"✅ 是":"❌ 否",
    "Cookie":navigator.cookieEnabled?"启用":"禁用",
    "屏幕分辨率":`${screen.width} × ${screen.height}`,
    "可视窗口":`${window.innerWidth} × ${window.innerHeight}`,
    "像素比":window.devicePixelRatio||1,
    "触控支持":ontouchstart!==undefined?"支持":"不支持",
    "WebGL":(function(){const c=document.createElement("canvas");const g=c.getContext("webgl")||c.getContext("experimental-webgl");return g?(g.getParameter(g.RENDERER)+" / "+g.getParameter(g.VENDOR)):"不可用"})(),
    "最大触摸点":navigator.maxTouchPoints||0,
    "内存":navigator.deviceMemory?navigator.deviceMemory+" GB":"未知",
    "CPU 核心":navigator.hardwareConcurrency?navigator.hardwareConcurrency+" 核":"未知",
    "连接类型":navigator.connection?.effectiveType||"-",
    "时区":Intl.DateTimeFormat().resolvedOptions().timeZone||"-",
  };
  return `<div class="tool-body"><h3>📱 设备信息</h3>
    <div class="di-table">${Object.entries(info).map(([k,v])=>`<div class="di-row"><div class="di-k">${esc(k)}</div><div class="di-v">${esc(String(v))}</div></div>`).join("")}</div>
    <button class="btn sm gray" onclick="copyText($('#sec-tools .di-table').innerText)" style="margin-top:8px">📋 复制全部信息</button></div>`;
}

/* ================= 提醒中心 ================= */
const remindedSet = new Set();
let reminderTimer = null, waterTimer = null;
function toggleReminders() {
  if (!("Notification" in window)) { toast("当前浏览器不支持通知"); return; }
  if (Notification.permission === "default") {
    Notification.requestPermission().then((p) => { D.settings.remindersEnabled = p === "granted"; save(true); renderSettings(); initReminders(); });
  } else {
    D.settings.remindersEnabled = !D.settings.remindersEnabled; save(true); renderSettings(); initReminders();
  }
}
function initReminders() {
  clearInterval(reminderTimer); clearInterval(waterTimer); reminderTimer = null; waterTimer = null;
  const st = $("#reminder-status");
  if (!D.settings.remindersEnabled || !("Notification" in window) || Notification.permission !== "granted") {
    if (st) st.textContent = D.settings.remindersEnabled ? "⚠️ 尚未授予通知权限，请在浏览器允许" : "";
    return;
  }
  if (st) st.textContent = "✅ 提醒运行中";
  reminderTimer = setInterval(checkDueReminders, 60000);
  checkDueReminders();
  if (D.settings.waterReminderMin > 0) waterTimer = setInterval(() => {
    const now = Date.now();
    if (now - (D.settings.waterLastTs || 0) >= D.settings.waterReminderMin * 60000) {
      D.settings.waterLastTs = now; save(true);
      fireNotification("💧 喝水提醒", "该喝水啦，保持健康~");
    }
  }, 30000);
}
function fireNotification(title, body) { try { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body }); } catch (e) {} }
function checkDueReminders() {
  if (!D.settings.remindersEnabled) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const t = todayStr();
  const key = (type, id) => type + ":" + id + ":" + t;
  D.todos.filter((x) => !x.done && x.due && x.due <= t).forEach((x) => { const k = key("todo", x.id); if (!remindedSet.has(k)) { remindedSet.add(k); fireNotification("✅ 待办到期", x.text); } });
  (D.habits || []).forEach((h) => { if (!h.history[t]) { const k = key("habit", h.id); if (!remindedSet.has(k)) { remindedSet.add(k); fireNotification("🔥 习惯打卡", "今天还没打卡：「" + h.name + "」"); } } });
  const now = new Date(); const hhmm = pad(now.getHours()) + ":" + pad(now.getMinutes());
  D.schedule.filter((s) => !s.notified && s.date === t && s.time && s.remind && s.time <= hhmm).forEach((s) => { s.notified = true; fireNotification("⏰ 日程提醒", s.title + " @" + s.time); });
}

/* ================= 语音输入 ================= */
let _recognition = null;
function voiceSupported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function voiceBtn(id) { if (!voiceSupported()) return ""; return `<button type="button" class="voice-btn" onclick="startVoice('${id}')" title="语音输入">🎤</button>`; }
function startVoice(inputId) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("当前浏览器不支持语音输入"); return; }
  const input = document.getElementById(inputId); if (!input) return;
  if (_recognition) { try { _recognition.stop(); } catch (e) {} _recognition = null; toast("已停止"); return; }
  const r = new SR(); r.lang = "zh-CN"; r.interimResults = false; r.continuous = false;
  r.onresult = (e) => { const txt = e.results[0][0].transcript; input.value = (input.value ? input.value + " " : "") + txt; if (input._onvoice) input._onvoice(txt); };
  r.onend = () => { _recognition = null; };
  r.onerror = () => { _recognition = null; toast("语音识别失败"); };
  _recognition = r;
  try { r.start(); toast("🎤 聆听中…说完自动填入"); } catch (e) { toast("无法启动语音"); }
}

/* ================= 全局快捷键 ================= */
function initShortcuts() {
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); openCommandPalette(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
    if (e.key === "/") { e.preventDefault(); openSearch(); }
    else if (e.key === "n" || e.key === "N") { e.preventDefault(); openQuickAdd(); }
    else if (e.key === "j") { e.preventDefault(); navRel(1); }
    else if (e.key === "k") { e.preventDefault(); navRel(-1); }
  });
}
function navRel(dir) { const ids = PAGES.map((p) => p.id); let i = ids.indexOf(cur); i = (i + dir + ids.length) % ids.length; go(ids[i]); }

/* ================= 导出增强 ================= */
function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportCsv(kind) {
  let rows = [], header = [];
  if (kind === "money") { header = ["日期", "类型", "分类", "金额", "备注"]; rows = D.money.map((m) => [m.date, m.type === "in" ? "收入" : "支出", m.cat || "", m.amount, m.note || ""]); }
  else if (kind === "diet") { header = ["日期", "餐次", "食物", "克数", "热量", "蛋白", "碳水", "脂肪"]; rows = D.meals.map((m) => [m.date, m.meal, m.name, m.grams || "", m.kcal || "", m.p || "", m.c || "", m.f || ""]); }
  if (!rows.length) return toast("没有可导出的数据");
  const csv = [header.join(",")].concat(rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(","))).join("\n");
  downloadFile(kind + "_" + todayStr() + ".csv", "﻿" + csv, "text/csv;charset=utf-8");
  toast("已导出 CSV");
}
function buildLifeReport() {
  const y = new Date().getFullYear(), m = monthStr();
  const monthMoney = D.money.filter((x) => x.date && x.date.startsWith(m));
  const exp = monthMoney.filter((x) => x.type !== "in").reduce((a, x) => a + (+x.amount || 0), 0);
  const inc = monthMoney.filter((x) => x.type === "in").reduce((a, x) => a + (+x.amount || 0), 0);
  const budget = D.moneyBudgets[m] || 0;
  const todosMonth = D.todos.filter((x) => x.created && ("" + x.created).startsWith(m));
  const done = todosMonth.filter((x) => x.done).length;
  const rate = todosMonth.length ? Math.round(done / todosMonth.length * 100) : 0;
  const studyMonth = D.study.filter((x) => x.date && x.date.startsWith(m));
  const studyMin = studyMonth.reduce((a, x) => a + (+x.minutes || 0), 0);
  const weightsY = D.weights.filter((x) => x.date && x.date.startsWith(y)).map((x) => +x.kg).filter(Boolean);
  const w0 = weightsY[0], w1 = weightsY[weightsY.length - 1];
  const habitDays = (D.habits || []).reduce((a, h) => a + Object.keys(h.history || {}).filter((d) => d.startsWith(m)).length, 0);
  return { y, m, exp, inc, budget, rate, done, total: todosMonth.length, studyMin, studyDays: studyMonth.length, w0, w1, habitDays, meals: D.meals.filter((x) => x.date && x.date.startsWith(m)).length };
}
function exportLifeReport() {
  const r = buildLifeReport();
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>月度生活报告 ${r.m}</title>
  <style>body{font-family:-apple-system,'PingFang SC',sans-serif;padding:40px;color:#222;max-width:760px;margin:auto}
  h1{color:#4f6ef7}h2{margin-top:28px;border-left:4px solid #4f6ef7;padding-left:10px}body>*{line-height:1.8}</style></head><body>
  <h1>📊 月度生活报告 · ${r.m}</h1>
  <h2>✅ 待办</h2><p>本月完成 ${r.done}/${r.total} 项，完成率 <b>${r.rate}%</b>。</p>
  <h2>📚 学习</h2><p>本月打卡 ${r.studyDays} 天，共 <b>${r.studyMin}</b> 分钟。</p>
  <h2>🥗 饮食</h2><p>本月记录 ${r.meals} 条饮食。</p>
  <h2>⚖️ 身体</h2><p>本年体重 ${r.w0 ? r.w0 + "kg" : "-"} → ${r.w1 ? r.w1 + "kg" : "-"}${r.w0 && r.w1 ? `（${r.w1 - r.w0 >= 0 ? "+" : ""}${Math.round((r.w1 - r.w0) * 10) / 10}kg）` : ""}；习惯本月打卡 ${r.habitDays} 次。</p>
  <h2>💰 记账</h2><p>本月支出 <b>¥${r.exp.toFixed(2)}</b>，收入 ¥${r.inc.toFixed(2)}。${r.budget ? `预算 ¥${r.budget}，剩余 <b>¥${(r.budget - r.exp).toFixed(2)}</b>。` : ""}</p>
  <hr style="margin-top:40px"><p style="color:#999;font-size:12px">由「生活工作台」生成 · ${new Date().toLocaleString("zh-CN")}</p>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) { downloadFile("生活报告_" + r.m + ".html", html, "text/html"); toast("已下载报告 HTML"); return; }
  w.document.write(html); w.document.close(); w.print();
}

/* ================= 账单 CSV 导入 / AI 识票 ================= */
function openBillImport() {
  const tpls = (D.billTemplates || []);
  const tplSel = tpls.length ? `<div style="display:flex;gap:8px;margin-bottom:8px"><select id="bill-tpl" class="inp" onchange="applyBillTpl(this.value)"><option value="">— 套用已存识别模板 —</option>${tpls.map((t,i)=>`<option value="${i}">${esc(t.name)}</option>`).join("")}</select></div>` : "";
  openModal(`<h3>📥 识别并导入手动记账表</h3>
  <p class="tool-sub">支持你这种「一行多项 / 多列金额」的手动记账（如租房花销表）：粘贴或上传 CSV/TSV，自动识别 日期 / 收支 / 分类 / 金额 / 备注 各列；多列金额可<b>拆成多条</b>（用列名当分类）或<b>合并求和</b>。识别方式可存成模板，下次一键复用。</p>
  ${tplSel}
  <textarea id="bill-csv" rows="7" class="inp" placeholder="日期,午饭,晚饭,其他,备注&#10;2026-06-21,13,22.41,30.24,晾衣杆+水+地铁"></textarea>
  <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
    <button class="btn" onclick="parseBillCsv()">解析并识别列</button>
    <button class="btn ghost" onclick="$('#bill-file').click()">选择文件</button>
    <select id="bill-mode" class="inp" style="flex:0 1 210px" title="多列金额的处理方式">
      <option value="split">多列金额 → 拆成多条</option>
      <option value="sum">多列金额 → 合并为一条</option>
    </select>
    <input type="date" id="bill-defdate" class="inp" style="flex:0 1 175px" title="缺日期的行使用此默认日期">
  </div>
  <input type="file" id="bill-file" accept=".csv,.txt,.tsv" style="display:none" onchange="billFileRead(this)">
  <div id="bill-map" class="tool-result"></div>
  <div id="bill-preview" class="tool-result"></div>`);
}
function billFileRead(inp) { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const ta = $("#bill-csv"); if (ta) ta.value = rd.result; parseBillCsv(); }; rd.readAsText(f); }
function _splitCsvLine(line) {
  let delim = ",";
  if (line.includes("\t")) delim = "\t";
  else if (line.includes(";")) delim = ";";
  else if (line.includes("，")) delim = "，";
  return line.split(delim).map((s) => s.trim());
}
function _p2(n) { return ("" + n).padStart(2, "0"); }
function _billNormDate(raw) {
  raw = ("" + (raw || "")).trim(); if (!raw) return "";
  const s = raw.replace(/[，,\/]/g, ".").replace(/\s/g, "");
  let m = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (m) return `${m[1]}-${_p2(m[2])}-${_p2(m[3])}`;
  m = s.match(/^(\d{1,2})\.(\d{1,})$/);
  if (m) { const mo = +m[1]; const da = Math.round((+s - mo) * 100); if (da >= 1 && da <= 31) return `${new Date().getFullYear()}-${_p2(mo)}-${_p2(da)}`; }
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return s;
  if (/^\d{1,2}-\d{1,2}$/.test(s)) return `${new Date().getFullYear()}-${s}`;
  return "";
}
const BILL_ROLE_KW = {
  date: ["日期","时间","年月日","号","date","time","day"],
  type: ["收支","类型","收/支","进出","收入支出","type","方向","in/out"],
  cat: ["分类","类别","类目","项目","物品","商品","名称","科目","用途","cat","category","item","name"],
  amount: ["金额","数额","价钱","花费","费用","支出额","收入额","实付","付款","金额(元)","amount","money","price","cost","fee","sum","total","付费"],
  note: ["备注","说明","摘要","描述","商户","用途说明","note","remark","desc","memo","merchant"]
};
const BILL_TOTAL_KW = ["合计","总计","小计","汇总","今日花费","total","sum"];
function _billRoleOf(header) {
  const h = ("" + (header || "")).toLowerCase();
  for (const role of ["date","type","cat","amount","note"]) {
    if (BILL_ROLE_KW[role].some((k) => h.includes(k.toLowerCase()))) return role;
  }
  return null;
}
function _billIsNum(v) { const s = ("" + (v == null ? "" : v)).replace(/[^\d.\-]/g, ""); return s !== "" && !isNaN(Number(s)) && isFinite(Number(s)); }
function _billNormCat(raw, type) {
  raw = ("" + (raw || "")).trim();
  if (!raw) return "其他";
  const cats = [].concat(MONEY_CATS["支出"] || [], MONEY_CATS["收入"] || []);
  if (cats.includes(raw)) return raw;
  const map = [["餐饮","餐饮|饭|吃|餐|食|午饭|晚饭|早餐|夜宵|瑞幸|咖啡|菜"],["交通","交通|地铁|公交|打车|滴滴|车|油|通勤|高铁|火车|机票|停车"],["购物","购物|买|购|物|杂|超市|淘宝|京东|拼多多|日用|用品|前置"],["居住","租|押金|钥匙|物业|水电|电费|水费|用电|燃气|煤气|住宿|房|家居|家电|家具|锅|刀|洗衣|清洁|抹布|洗洁"],["娱乐","娱乐|玩|电影|游戏|会员|充值"],["医疗","医|药|医院|诊所|保健|口腔"],["学习","学|书|课|培训|资料|考试"],["健身","健身|练|运动|器材"],["其他","其他|杂费|货拉|搬|充电"]];
  for (const [c, re] of map) if (new RegExp(re).test(raw)) return c;
  return raw.length <= 6 ? raw : "其他";
}
function _billTypeOf(cat, typeCol) {
  if (typeCol && /收|in|收入|正|工资|兼职|红包|理财/.test(typeCol)) return "收入";
  if (MONEY_CATS["收入"] && MONEY_CATS["收入"].includes(cat) && !(MONEY_CATS["支出"] || []).includes(cat)) return "收入";
  return "支出";
}
function _billParseToCols() {
  const raw = $("#bill-csv").value.trim(); if (!raw) { toast("请粘贴或选择 CSV"); return null; }
  const lines = raw.split(/\r?\n/).filter(Boolean); if (!lines.length) { toast("无内容"); return null; }
  const head = _splitCsvLine(lines[0]);
  const isHeader = head.length >= 2 && /日期|date|收支|type|分类|cat|金额|amount|备注|note|商户|merchant|午饭|晚饭|花费|项目|物品|名称|时间/i.test(lines[0]);
  const dataLines = isHeader ? lines.slice(1) : lines;
  const n = head.length;
  const roles = new Array(n).fill(null);
  const used = {};
  for (let i = 0; i < n; i++) {
    const h = ("" + head[i]).toLowerCase();
    if (BILL_TOTAL_KW.some((k) => h.includes(k.toLowerCase()))) continue;
    const r = _billRoleOf(head[i]);
    if (r && !(r in used)) { roles[i] = r; used[r] = i; }
  }
  for (let i = 0; i < n; i++) {
    if (roles[i]) continue;
    if (BILL_TOTAL_KW.some((k) => ("" + head[i]).toLowerCase().includes(k.toLowerCase()))) continue;
    if (dataLines.length && _billIsNum(_splitCsvLine(dataLines[0])[i])) roles[i] = "金额";
  }
  if (!roles.includes("日期") && n > 0) roles[0] = "日期";
  D._billHead = head;
  return { head, isHeader, dataLines, roles, n };
}
function parseBillCsv() {
  const p = _billParseToCols(); if (!p) return;
  const { head, n } = p;
  let roles = p.roles.slice();
  if (D._billRoles && D._billRoles.length === n) { for (let i = 0; i < n; i++) if (D._billRoles[i] && D._billRoles[i] !== "忽略") roles[i] = D._billRoles[i]; }
  if (!D._billCatMap) D._billCatMap = {};
  for (let i = 0; i < n; i++) if (roles[i] === "金额" && !D._billCatMap[i]) D._billCatMap[i] = _billNormCat(head[i], "支出");
  D._billRoles = roles.map((r) => r || "忽略");
  const allCats = [].concat(MONEY_CATS["支出"] || [], MONEY_CATS["收入"] || []);
  const roleOpts = (cur) => ["忽略","日期","收支","分类","金额","备注"].map((r) => `<option ${r === cur ? "selected" : ""}>${r}</option>`).join("");
  const mapHtml = head.map((h, i) => `
    <div style="display:flex;gap:6px;align-items:center;margin:4px 0;font-size:12px">
      <span style="flex:0 0 130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(h)}">${esc(h) || "（空）"}</span>
      <select class="inp sm" style="flex:0 0 92px" onchange="D._billRoles[${i}]=this.value;if(this.value==='金额'&&!D._billCatMap[${i}])D._billCatMap[${i}]=_billNormCat('${esc(h)}','支出');renderBillMapCats()">${roleOpts(roles[i] || "忽略")}</select>
      <span id="bill-catwrap-${i}"></span>
    </div>`).join("");
  $("#bill-map").innerHTML = `<div style="margin-top:10px"><div style="font-size:12px;color:var(--text2);margin-bottom:4px">识别到 ${n} 列，请确认每列含义（金额列可指定归入哪个分类）：</div>${mapHtml}
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
      <button class="btn sm" onclick="renderBillPreview()">预览条目</button>
      <input id="bill-tpl-name" class="inp sm" style="flex:1;min-width:120px" placeholder="模板名，如：租房花销表">
      <button class="btn ghost sm" onclick="saveBillTpl()">💾 存为识别模板</button>
    </div></div>`;
  renderBillMapCats();
  renderBillPreview();
}
function renderBillMapCats() {
  const roles = D._billRoles || [];
  const allCats = [].concat(MONEY_CATS["支出"] || [], MONEY_CATS["收入"] || []);
  for (let i = 0; i < roles.length; i++) {
    const el = $("#bill-catwrap-" + i); if (!el) continue;
    if (roles[i] === "金额") {
      const cur = D._billCatMap[i] || "其他";
      el.innerHTML = `<select class="inp sm" style="flex:0 0 120px" onchange="D._billCatMap[${i}]=this.value">${allCats.map((c) => `<option ${c === cur ? "selected" : ""}>${c}</option>`).join("")}</select>`;
    } else el.innerHTML = "";
  }
}
function _billBuildEntries() {
  const raw = $("#bill-csv").value.trim(); if (!raw) return [];
  const p = _billParseToCols(); if (!p) return [];
  const { dataLines, n } = p;
  const head = D._billHead || p.head;
  const roles = (D._billRoles && D._billRoles.length === n) ? D._billRoles : p.roles.map((r) => r || "忽略");
  const mode = ($("#bill-mode") && $("#bill-mode").value) || "split";
  const out = [];
  dataLines.forEach((ln) => {
    const c = _splitCsvLine(ln);
    const di = roles.indexOf("日期"); let date = _billNormDate((di >= 0 ? c[di] : "") || "");
    if (!date) { const dd = ($("#bill-defdate") && $("#bill-defdate").value) || ""; if (dd) date = dd; }
    if (!date) return;
    const ti = roles.indexOf("收支"); const typeCol = ti >= 0 ? c[ti] : "";
    const ni = roles.indexOf("备注"); const noteCol = ni >= 0 ? c[ni] : "";
    const ci = roles.indexOf("分类"); const catCol = ci >= 0 ? c[ci] : "";
    const amtIdxs = []; for (let i = 0; i < n; i++) if (roles[i] === "金额") amtIdxs.push(i);
    if (!amtIdxs.length) return;
    if (mode === "sum") {
      let sum = 0; amtIdxs.forEach((i) => { const a = parseFloat(String(c[i] || "").replace(/[^\d.\-]/g, "")); if (isFinite(a)) sum += a; });
      sum = Math.round(Math.abs(sum) * 100) / 100; if (sum <= 0) return;
      const cat = catCol ? _billNormCat(catCol, "支出") : "其他";
      out.push({ id: uid(), date, type: _billTypeOf(cat, typeCol), cat, amount: sum, note: noteCol || "" });
    } else {
      amtIdxs.forEach((i) => {
        const a = parseFloat(String(c[i] || "").replace(/[^\d.\-]/g, "")); if (!isFinite(a) || a === 0) return;
        const cat = (D._billCatMap && D._billCatMap[i]) ? D._billCatMap[i] : _billNormCat(head[i], "支出");
        const note = [head[i], noteCol].filter(Boolean).join(" · ");
        out.push({ id: uid(), date, type: _billTypeOf(cat, typeCol), cat, amount: Math.round(Math.abs(a) * 100) / 100, note });
      });
    }
  });
  return out;
}
function renderBillPreview() {
  const out = _billBuildEntries();
  if (!out.length) { const el = $("#bill-preview"); if (el) el.innerHTML = `<div style="font-size:12px;color:var(--text2);margin-top:8px">未解析到有效条目（需有「日期」列，支持 YYYY-MM-DD / MM-DD / M.D 等写法）</div>`; D._billPreview = []; return; }
  const exist = D.money || [];
  let dup = 0;
  const shown = out.filter((o) => {
    const hit = exist.some((e) => e.date === o.date && Math.abs(e.amount - o.amount) < 0.005 && e.cat === o.cat && (e.note || "") === (o.note || ""));
    if (hit) { dup++; return false; } return true;
  });
  D._billPreview = shown;
  $("#bill-preview").innerHTML = `<div style="text-align:left;max-height:220px;overflow:auto;margin-top:8px">
    <div style="font-size:12px;color:var(--text2);margin-bottom:6px">识别到 <b>${out.length}</b> 条${dup ? `，其中 <b style="color:var(--orange)">${dup}</b> 条与现有重复将跳过` : ""}：</div>
    ${shown.slice(0, 60).map((o) => `<div style="font-size:12px;padding:3px 0;border-bottom:1px solid var(--line)">${o.date} · ${o.type === "收入" ? "收入" : "支出"} · <span class="tag hi">${esc(o.cat)}</span> · ¥${o.amount}${o.note ? ` · ${esc(o.note)}` : ""}</div>`).join("")}
    ${shown.length > 60 ? '<div style="font-size:12px;color:var(--text2)">…仅显示前 60 条</div>' : ""}
    </div><button class="btn" style="margin-top:10px;width:100%" onclick="confirmBillImport()">✅ 确认导入 ${shown.length} 条</button>`;
}
function applyBillTpl(idx) {
  if (idx === "" || idx == null) return;
  const t = (D.billTemplates || [])[+idx]; if (!t) return;
  D._billRoles = (t.roles || []).slice();
  D._billCatMap = JSON.parse(JSON.stringify(t.catMap || {}));
  D._billHead = (t.header || "").split(",");
  const ms = $("#bill-mode"); if (ms && t.mode) ms.value = t.mode;
  const ta = $("#bill-csv");
  if (ta && ta.value.trim()) parseBillCsv();
  toast("已套用模板：" + t.name);
}
function saveBillTpl() {
  const p = _billParseToCols(); if (!p) return;
  const name = ($("#bill-tpl-name") && $("#bill-tpl-name").value.trim()) || "我的手动记账表";
  if (!D.billTemplates) D.billTemplates = [];
  D.billTemplates.push({ name, header: (D._billHead || p.head).join(","), roles: (D._billRoles || p.roles.map((r) => r || "忽略")), catMap: D._billCatMap || {}, mode: ($("#bill-mode") && $("#bill-mode").value) || "split" });
  save();
  toast("已保存识别模板：" + name);
  openBillImport();
}
function confirmBillImport() {
  let out = (D._billPreview || []).filter((o) => o.type === "收入" || o.type === "支出");
  if (!out.length) return toast("没有可导入的条目");
  const exist = D.money || [];
  out = out.filter((o) => !exist.some((e) => e.date === o.date && Math.abs(e.amount - o.amount) < 0.005 && e.cat === o.cat && (e.note || "") === (o.note || "")));
  if (!out.length) return toast("全部重复，未导入");
  D.money = D.money.concat(out);
  save();
  toast("已导入 " + out.length + " 条");
  closeModal();
  if (cur === "money") renderMoney();
}

function openAiReceipt() {
  if (!aiReady()) { toast("请先在设置配置 AI 接口"); showSetupGuide("ai"); return; }
  openModal(`<h3>🤖 AI 识票</h3><p class="tool-sub">粘贴小票文字或截图 OCR 结果，AI 自动拆成记账条目。</p>
    <textarea id="receipt-text" rows="6" class="inp" placeholder="例如：&#10;7-01 午餐 牛肉面 28&#10;7-01 打车 19.5"></textarea>
    <div style="display:flex;gap:8px;margin-top:10px">
      <label class="btn" style="flex:1;text-align:center;cursor:pointer">📷 上传小票图<input id="receipt-img" type="file" accept="image/*" style="display:none" onchange="receiptImgPreview()"></label>
      <button class="btn" style="flex:1" onclick="runAiReceiptImg()">🤖 图片识别</button>
    </div>
    <button class="btn" style="margin-top:10px;width:100%" onclick="runAiReceipt()">🔍 AI 识别并预览</button>
    <div id="receipt-preview" class="tool-result"></div>`);
}
async function runAiReceipt() {
  const txt = $("#receipt-text").value.trim(); if (!txt) return toast("请粘贴小票文字");
  toast("AI 识别中…");
  const prompt = "从以下小票/账单文字提取消费条目，返回 JSON 数组，每条：{\"date\":\"YYYY-MM-DD\",\"type\":\"out\",\"cat\":\"分类\",\"amount\":数字,\"note\":\"备注\"}。只返回 JSON 数组，不要解释。文字：\n" + txt;
  let res; try { res = await aiChat(prompt); } catch (e) { return toast("AI 调用失败"); }
  let items; try { items = JSON.parse(res.replace(/```json|```/g, "").trim()); } catch (e) { return toast("AI 返回无法解析，请检查配置"); }
  if (!Array.isArray(items) || !items.length) return toast("未识别到条目");
  const out = items.map((it) => ({ id: uid(), date: ("" + (it.date || todayStr())).replace(/\//g, "-"), type: it.type === "in" ? "in" : "out", cat: it.cat || "其他", amount: Math.abs(+it.amount || 0), note: it.note || "" }));
  out.forEach((o) => { if (/^\d{1,2}-\d{1,2}$/.test(o.date)) o.date = new Date().getFullYear() + "-" + o.date; });
  D._billPreview = out;
  $("#receipt-preview").innerHTML = `<div style="text-align:left;max-height:200px;overflow:auto">${out.map((o) => `<div style="font-size:12px;padding:3px 0;border-bottom:1px solid var(--line)">${o.date} · ${o.type === "in" ? "收入" : "支出"} · ${esc(o.cat)} · ¥${o.amount} ${o.note ? "· " + esc(o.note) : ""}</div>`).join("")}</div>
    <button class="btn" style="margin-top:10px;width:100%" onclick="confirmBillImport()">✅ 确认导入 ${out.length} 条</button>`;
  toast("识别完成");
}

/* ================= 年度生命统计 ================= */
function renderStats() {
  const y = new Date().getFullYear();
  const minByDate = {}; D.study.forEach((s) => { minByDate[s.date] = (minByDate[s.date] || 0) + (+s.minutes || 0); });
  const wy = D.weights.filter((x) => x.date && x.date.startsWith(y)).sort((a, b) => a.date > b.date ? 1 : -1);
  const wSvg = (() => {
    if (wy.length < 2) return '<div class="empty">记录 2 次以上体重后显示年度曲线</div>';
    const W = 680, H = 140, pd = 20; const ks = wy.map((x) => +x.kg); const mn = Math.min.apply(null, ks) - 1, mx = Math.max.apply(null, ks) + 1;
    const X = (i) => pd + i * (W - 2 * pd) / (wy.length - 1);
    const Y = (v) => pd + (1 - (v - mn) / (mx - mn)) * (H - 2 * pd);
    const pts = wy.map((x, i) => `${X(i).toFixed(1)},${Y(+x.kg).toFixed(1)}`).join(" ");
    return `<div class="chart-wrap"><svg width="100%" viewBox="0 0 ${W} ${H}" style="min-width:300px"><polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="2"/></svg></div>`;
  })();
  const doneY = D.todos.filter((x) => x.done && x.created && ("" + x.created).startsWith(y)).length;
  const habitDays = (D.habits || []).reduce((a, h) => a + Object.keys(h.history || {}).filter((d) => d.startsWith(y)).length, 0);
  $("#sec-stats").innerHTML = `
  <div class="grid cols-2">
    <div class="card"><h3>💰 ${y} 年支出趋势</h3>${yearTrendSvg(y)}</div>
    <div class="card"><h3>📚 全年学习热力</h3>${studyHeatmapHtml(minByDate)}</div>
    <div class="card"><h3>⚖️ ${y} 年体重变化</h3>${wSvg}</div>
    <div class="card"><h3>📌 年度里程碑</h3>
      <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:14px;line-height:2">
        <div>✅ 完成待办 <b>${doneY}</b> 项</div>
        <div>🔥 习惯打卡 <b>${habitDays}</b> 次</div>
        <div>📚 学习 <b>${D.study.filter((x) => x.date && x.date.startsWith(y)).length}</b> 天</div>
        <div>⚖️ 体重记录 <b>${wy.length}</b> 次</div>
      </div>
    </div>
    <div class="card" style="grid-column:1/-1">${correlationCardHtml()}</div>
  </div>`;
}

/* ================= 待办抽签决定 ================= */
function decideTodo() {
  const open = D.todos.filter((x) => !x.done);
  if (!open.length) return toast("没有未完成的待办");
  window.__decideTodos = open;
  openModal(`<h3>🎲 抽签决定做哪件</h3><p class="tool-sub">${open.length} 件未完成的待办</p>
    <div id="decide-todo-res" class="tool-result" style="display:block"></div>
    <button class="btn" style="margin-top:10px;width:100%" onclick="decideTodoRoll()">🎯 抽！</button>`);
  $("#decide-todo-res").innerHTML = '<div class="lot-animate">' + esc(open[Math.floor(Math.random() * open.length)].text) + '</div>';
}
function decideTodoRoll() {
  const open = window.__decideTodos || []; if (!open.length) return;
  const el = $("#decide-todo-res"); if (!el) return;
  let cnt = 0; const max = 14 + Math.floor(Math.random() * 8);
  const iv = setInterval(() => {
    el.innerHTML = '<div class="lot-animate">' + esc(open[Math.floor(Math.random() * open.length)].text) + '</div>';
    if (++cnt >= max) { clearInterval(iv); const w = open[Math.floor(Math.random() * open.length)]; el.innerHTML = '<div class="lot-winner">🎯 ' + esc(w.text) + '</div>'; navigator.vibrate && navigator.vibrate([100, 50, 100]); }
  }, 80);
}

/* ================= 启动 ================= */
const RENDER = {
  dashboard: renderDashboard, todo: renderTodo, schedule: renderSchedule,
  calendar: renderCalendar, diet: renderDiet, money: renderMoney,
  hot: renderHot, wellness: renderWellness, tarot: renderTarot, tao: renderTao,
  study: renderStudy, plan: renderPlan,
  weight: renderWeight, settings: renderSettings,
  kitchen: renderKitchen, sop: renderSop, shopping: renderShopping,
  habits: renderHabits, vault: renderVaults, review: renderReview,
  files: renderFiles,
  stats: renderStats,
  tools: renderTools,
  travel: renderTravel,
  xhs: renderXhs,
  fitness: renderFitness,
  assets: renderAssets, goals: renderGoals, bookmarks: renderBookmarks,
};

/* ===== 新增模块：资产/净值、目标/OKR、收藏/稍后读、分类预算设置 ===== */
let bmFilter = "";
const ASSET_TYPES = ["现金", "卡", "理财", "负债", "其他"];
function netWorth() {
  const a = D.assets || [];
  const asset = a.filter(x => x.type !== "负债").reduce((s, x) => s + (+x.value || 0), 0);
  const debt = a.filter(x => x.type === "负债").reduce((s, x) => s + (+x.value || 0), 0);
  return { asset, debt, net: asset - debt };
}
function renderAssets() {
  const a = D.assets || [];
  const groups = {}; ASSET_TYPES.forEach(t => groups[t] = []);
  a.forEach(x => (groups[x.type] || (groups[x.type] = [])).push(x));
  const sum = (t) => (groups[t] || []).reduce((s, x) => s + (+x.value || 0), 0);
  const nw = netWorth();
  const stat = (title, val, col) => `<div class="card stat"><div class="v" style="color:${col}">${fmtMoney(val)}</div><div class="l">${title}</div></div>`;
  const listHtml = (t) => (groups[t] || []).map(x => `<div class="list-item">
    <div class="grow"><div class="title">${esc(x.name)}</div>${x.note ? `<div class="sub">${esc(x.note)}</div>` : ""}</div>
    <b style="color:${t === "负债" ? "var(--red)" : "var(--green)"}">${t === "负债" ? "−" : "+"}${fmtMoney(x.value)}</b>
    <button class="icon-btn" onclick="delAsset('${x.id}')">✕</button></div>`).join("") || '<div class="empty">暂无</div>';
  $("#sec-assets").innerHTML = `
  <div class="grid cols-4" style="margin-bottom:16px">
    ${stat("净资产", nw.net, nw.net >= 0 ? "var(--primary)" : "var(--red)")}
    ${stat("总资产", nw.asset, "var(--green)")}
    ${stat("总负债", nw.debt, "var(--red)")}
    ${stat("条目数", a.length, "var(--text2)")}
  </div>
  <div class="card" style="margin-bottom:16px">
    <h3>添加资产 / 负债</h3>
    <div class="form-row" style="margin-top:8px">
      <input id="as-name" placeholder="名称，如：招商银行卡 / 花呗 / 余额宝" style="flex:2">
      <select id="as-type">${ASSET_TYPES.map(t => `<option>${t}</option>`).join("")}</select>
      <input id="as-value" type="number" placeholder="金额" min="0" step="0.01" style="flex:1">
      <input id="as-note" placeholder="备注(可选)" style="flex:1.5">
      <button class="btn" onclick="addAsset()">添加</button>
    </div>
  </div>
  ${ASSET_TYPES.map(t => `<div class="card" style="margin-bottom:16px"><h3>${t === "负债" ? "负债" : "资产"} ${t} <span style="color:var(--text2);font-weight:400">${fmtMoney(sum(t))}</span></h3>${listHtml(t)}</div>`).join("")}
  `;
}
function addAsset() {
  const name = $("#as-name").value.trim(); if (!name) return toast("请输入名称");
  const value = parseFloat($("#as-value").value); if (!isFinite(value) || value <= 0) return toast("请输入金额");
  D.assets = D.assets || [];
  D.assets.push({ id: uid(), name, type: $("#as-type").value, value: Math.round(value * 100) / 100, note: $("#as-note").value.trim() });
  save(); renderAssets(); toast("已添加");
}
function delAsset(id) { if (!appConfirm("删除该条目？")) return; D.assets = (D.assets || []).filter(x => x.id !== id); save(); renderAssets(); }

/* ---- 目标 / OKR ---- */
const GOAL_PERIODS = ["年", "季", "月"];
function renderGoals() {
  const list = D.goals || [];
  const byP = {}; GOAL_PERIODS.forEach(p => byP[p] = []);
  list.forEach(g => (byP[g.period] || (byP[g.period] = [])).push(g));
  const childHtml = (g) => (g.children || []).map(c => `<div class="list-item" style="padding:4px 0;border:none">
    <button class="checkbox ${c.done ? "on" : ""}" onclick="toggleGoalChild('${g.id}','${c.id}')">${c.done ? "✓" : ""}</button>
    <div class="grow" style="font-size:13px">${esc(c.text)}</div></div>`).join("") || '<div class="empty" style="font-size:12px">暂无子任务</div>';
  const itemHtml = (g) => `<div class="card" style="margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:center"><div class="title" style="font-weight:600">${esc(g.title)}</div><button class="icon-btn" onclick="delGoal('${g.id}')">✕</button></div>
    <div class="sub" style="margin:4px 0 8px">${g.period}目标${g.target ? " · 目标：" + esc(g.target) : ""}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div class="pbar" style="flex:1"><div style="width:${Math.min(100, g.progress || 0)}%;background:var(--primary)"></div></div>
      <span style="font-size:12px;color:var(--text2)">${g.progress || 0}%</span>
      <input type="range" min="0" max="100" value="${g.progress || 0}" onchange="setGoalProgress('${g.id}',this.value)" style="width:90px">
    </div>
    ${g.note ? `<div class="sub" style="white-space:pre-wrap;margin-bottom:8px">${esc(g.note)}</div>` : ""}
    <div style="margin:4px 0 8px">${childHtml(g)}</div>
    <div class="form-row"><input id="gc-${g.id}" placeholder="添加子任务" style="flex:1"><button class="btn sm" onclick="addGoalChild('${g.id}')">+子任务</button></div>
  </div>`;
  $("#sec-goals").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <h3>新建目标</h3>
    <div class="form-row" style="margin-top:8px">
      <input id="g-title" placeholder="目标标题，如：2026 攒下 5 万" style="flex:2">
      <select id="g-period">${GOAL_PERIODS.map(p => `<option>${p}</option>`).join("")}</select>
      <input id="g-target" placeholder="量化目标(可选)" style="flex:1.5">
      <button class="btn" onclick="addGoal()">创建</button>
    </div>
  </div>
  ${GOAL_PERIODS.map(p => `<div class="card" style="margin-bottom:16px"><h3>${p}目标（${byP[p].length}）</h3>${byP[p].length ? byP[p].map(itemHtml).join("") : '<div class="empty">暂无</div>'}</div>`).join("")}
  `;
}
function addGoal() {
  const title = $("#g-title").value.trim(); if (!title) return toast("请输入目标");
  D.goals = D.goals || [];
  D.goals.push({ id: uid(), title, period: $("#g-period").value, target: $("#g-target").value.trim(), progress: 0, note: "", children: [] });
  save(); renderGoals(); toast("已创建");
}
function delGoal(id) { if (!appConfirm("删除该目标？")) return; D.goals = (D.goals || []).filter(g => g.id !== id); save(); renderGoals(); }
function setGoalProgress(id, v) { const g = (D.goals || []).find(x => x.id === id); if (g) { g.progress = +v; save(); } }
function addGoalChild(id) {
  const g = (D.goals || []).find(x => x.id === id); if (!g) return;
  const t = $("#gc-" + id).value.trim(); if (!t) return toast("请输入子任务");
  g.children = g.children || []; g.children.push({ id: uid(), text: t, done: false });
  $("#gc-" + id).value = ""; save(); renderGoals();
}
function toggleGoalChild(id, cid) {
  const g = (D.goals || []).find(x => x.id === id); if (!g) return;
  const c = (g.children || []).find(x => x.id === cid); if (c) { c.done = !c.done; save(); renderGoals(); }
}

/* ---- 收藏 / 稍后读 ---- */
function renderBookmarks() {
  const list = D.bookmarks || [];
  const tags = [...new Set(list.map(b => b.tag).filter(Boolean))];
  const shown = bmFilter ? list.filter(b => b.tag === bmFilter) : list;
  const itemHtml = (b) => `<div class="list-item">
    <div class="grow"><div class="title" style="cursor:pointer" onclick="openBookmark('${b.id}')">${esc(b.title) || esc(b.url)}</div>
      <div class="sub">${b.tag ? `<span class="tag">${esc(b.tag)}</span> ` : ""}${b.note ? esc(b.note) : ""}${b.created ? " · " + b.created : ""}</div></div>
    <button class="icon-btn" onclick="copyText('${esc(b.url)}')" title="复制链接">复制</button>
    <button class="icon-btn" onclick="delBookmark('${b.id}')">✕</button></div>`;
  $("#sec-bookmarks").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <h3>添加收藏</h3>
    <div class="form-row" style="margin-top:8px">
      <input id="bm-title" placeholder="标题(可选)" style="flex:1.5">
      <input id="bm-url" placeholder="链接 URL" style="flex:2">
      <input id="bm-tag" placeholder="标签(可选)" style="flex:1">
      <input id="bm-note" placeholder="备注(可选)" style="flex:1">
      <button class="btn" onclick="addBookmark()">收藏</button>
    </div>
  </div>
  ${tags.length ? `<div style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap">${["", ...tags].map(t => `<button class="btn sm ${bmFilter === t ? "" : "ghost"}" onclick="bmFilterSet('${t}')">${t ? esc(t) : "全部"}</button>`).join("")}</div>` : ""}
  <div class="card">${shown.length ? shown.slice().reverse().map(itemHtml).join("") : '<div class="empty">还没有收藏，看到好内容就收进来</div>'}</div>
  `;
}
function addBookmark() {
  const url = $("#bm-url").value.trim(); if (!url) return toast("请输入链接");
  const u = safeUrl(url); if (!u) return toast("链接不合法");
  D.bookmarks = D.bookmarks || [];
  D.bookmarks.push({ id: uid(), title: $("#bm-title").value.trim(), url: u, note: $("#bm-note").value.trim(), tag: $("#bm-tag").value.trim(), created: todayStr() });
  save(); renderBookmarks(); toast("已收藏");
}
function delBookmark(id) { if (!appConfirm("删除该收藏？")) return; D.bookmarks = (D.bookmarks || []).filter(b => b.id !== id); save(); renderBookmarks(); }
function openBookmark(id) { const b = (D.bookmarks || []).find(x => x.id === id); if (b && b.url) window.open(b.url, "_blank", "noopener"); }
function bmFilterSet(t) { bmFilter = t; renderBookmarks(); }

/* ---- 分类预算设置 + 总览预算卡 ---- */
function openCatBudgetModal() {
  const ms = moneyMonth;
  const cats = MONEY_CATS["支出"];
  const cur = (D.settings.catBudgets && D.settings.catBudgets[ms]) || {};
  openModal(`<h3>设置 ${ms.slice(5)}月 分类预算</h3>
    <div style="text-align:left;max-height:50vh;overflow:auto">
    ${cats.map(c => `<div class="form-row" style="margin-bottom:8px"><span style="flex:0 1 80px;font-size:13px">${c}</span><input id="cb-${c}" type="number" placeholder="预算金额" min="0" step="0.01" value="${cur[c] || ""}"></div>`).join("")}
    </div>
    <button class="btn" style="margin-top:10px;width:100%" onclick="setCatBudgets()">保存分类预算</button>`);
}
function setCatBudgets() {
  const ms = moneyMonth; const obj = {};
  MONEY_CATS["支出"].forEach(c => { const v = parseFloat($("#cb-" + c).value); if (isFinite(v) && v > 0) obj[c] = v; });
  D.settings.catBudgets = D.settings.catBudgets || {};
  D.settings.catBudgets[ms] = obj; save(); closeModal(); renderMoney(); toast("已保存分类预算");
}
function budgetDashCard() {
  const ms = moneyMonth;
  const b = D.moneyBudgets[ms] || 0;
  const exp = D.money.filter(x => x.type === "支出" && moneyCounted(x) && x.date.startsWith(ms)).reduce((a, x) => a + x.amount, 0);
  if (!b) return `<div class="card span2" data-dash="budget"><h3>本月预算 <button class="more" onclick="go('money')">去设</button></h3><div class="empty">还没设 ${ms.slice(5)} 月预算</div></div>`;
  const pct = Math.min(100, Math.round(exp / b * 100));
  const over = exp > b;
  const cats = (D.settings.catBudgets && D.settings.catBudgets[ms]) || {};
  const catLine = Object.keys(cats).slice(0, 3).map(c => {
    const sp = D.money.filter(x => x.type === "支出" && x.cat === c && moneyCounted(x) && x.date.startsWith(ms)).reduce((a, x) => a + x.amount, 0);
    return c + " " + fmtMoney(sp) + "/" + fmtMoney(cats[c]);
  }).join("，");
  return `<div class="card span2" data-dash="budget"><h3>本月预算执行 <button class="more" onclick="go('money')">详情</button></h3>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span>已用 <b style="color:${over ? "var(--red)" : "var(--text)"}">${fmtMoney(exp)}</b> / ${fmtMoney(b)}（${pct}%）</span><span style="color:${over ? "var(--red)" : "var(--green)"}">${over ? "超支 " + fmtMoney(exp - b) : "剩 " + fmtMoney(b - exp)}</span></div>
    <div class="pbar" style="height:10px"><div style="width:${pct}%;background:${over ? "var(--red)" : pct > 80 ? "var(--orange)" : "var(--green)"}"></div></div>
    ${catLine ? `<div style="margin-top:8px;font-size:12px;color:var(--text2)">分类预算：${catLine}${Object.keys(cats).length > 3 ? "…" : ""}</div>` : ""}
  </div>`;
}

/* ---- AI 识票：图片 OCR 通道（复用 confirmBillImport 导入） ---- */
let _receiptImgData = null;
function receiptImgPreview() {
  const f = $("#receipt-img").files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { _receiptImgData = r.result; $("#receipt-preview").innerHTML = `<img src="${_receiptImgData}" style="max-width:100%;max-height:220px;border-radius:8px;margin-top:8px">`; };
  r.readAsDataURL(f);
}
async function runAiReceiptImg() {
  if (!_receiptImgData) return toast("请先选择小票图片");
  toast("AI 识别中…");
  const prompt = "这是一张小票/账单截图，请 OCR 并提取消费条目，返回 JSON 数组，每条：{\"date\":\"YYYY-MM-DD\",\"type\":\"out\",\"cat\":\"分类\",\"amount\":数字,\"note\":\"备注\"}。只返回 JSON 数组，不要解释。";
  const messages = [{ role: "user", content: [ { type: "text", text: prompt }, { type: "image_url", image_url: { url: _receiptImgData } } ] }];
  let res; try { res = await aiChat(messages); } catch (e) { return toast("AI 调用失败"); }
  let items; try { items = JSON.parse(res.replace(/```json|```/g, "").trim()); } catch (e) { return toast("AI 返回无法解析，请检查配置"); }
  if (!Array.isArray(items) || !items.length) return toast("未识别到条目");
  const out = items.map((it) => ({ id: uid(), date: ("" + (it.date || todayStr())).replace(/\//g, "-"), type: it.type === "in" ? "in" : "out", cat: it.cat || "其他", amount: Math.abs(+it.amount || 0), note: it.note || "" }));
  out.forEach((o) => { if (/^\d{1,2}-\d{1,2}$/.test(o.date)) o.date = new Date().getFullYear() + "-" + o.date; });
  D._billPreview = out;
  $("#receipt-preview").innerHTML = `<div style="text-align:left;max-height:200px;overflow:auto">${out.map((o) => `<div style="font-size:12px;padding:3px 0;border-bottom:1px solid var(--line)">${o.date} · ${o.type === "in" ? "收入" : "支出"} · ${esc(o.cat)} · ¥${o.amount} ${o.note ? "· " + esc(o.note) : ""}</div>`).join("")}</div>
    <button class="btn" style="margin-top:10px;width:100%" onclick="confirmBillImport()">✅ 确认导入 ${out.length} 条</button>`;
  toast("识别完成");
}


function renderFitness() {
  const ext = "fitness/fit/index.html";
  let bar = '<div class="fitness-bar"><span>💪 个人健身系统（基于 Lzheng Fitness 离线工作台）</span>';
  let src;
  if (window.FITNESS_B64) {
    // 便携单文件版：健身模块已 base64 内联，用 Blob 还原后载入 iframe
    const bin = atob(window.FITNESS_B64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const htmlStr = new TextDecoder("utf-8").decode(bytes);
    const blob = new Blob([htmlStr], { type: "text/html;charset=utf-8" });
    src = URL.createObjectURL(blob);
    bar += '<span class="tag" style="margin-left:8px;opacity:.75">📦 已内联·离线可用</span>';
  } else {
    // 在线部署版：走外部文件
    src = ext;
    bar += '<a class="btn sm" href="' + ext + '" target="_blank" rel="noopener">↗ 单独打开窗口</a>';
  }
  bar += '</div>';
  $("#sec-fitness").innerHTML =
    '<div class="fitness-wrap">' + bar +
    '<iframe class="fitness-frame" src="' + src + '" title="个人健身系统" loading="lazy"></iframe>' +
    '</div>';
}

/* ================= 新增模块 ================= */
let kitchenTab = "menu";
let orderDate = todayStr();
let curOrder = [];
let inspireText = "";
let lastAutoPlan = [];
let sopFilter = "all";
let shopFilter = "all";

/* ----- 倒数日 / 纪念日 ----- */
function countdownDays(c) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(c.date + "T00:00:00");
  return Math.round((d - today) / 86400000);
}
function countdownCardHtml(c) {
  const diff = countdownDays(c);
  const sub = c.type === "anniversary"
    ? `纪念日 · ${diff <= 0 ? "已 " + (-diff) + " 天" : "还有 " + (-diff) + " 天"}`
    : `倒数日 · ${diff >= 0 ? "还剩 " + diff + " 天" : "已过去 " + (-diff) + " 天"}`;
  return `<div class="list-item">
    <span style="font-size:20px">${c.emoji || (c.type === "anniversary" ? "🎉" : "⏳")}</span>
    <div class="grow"><div class="title">${esc(c.title)}</div><div class="sub">${c.date} · ${sub}</div></div>
    <button class="icon-btn" onclick="delCountdown('${c.id}')">✕</button></div>`;
}
function dashboardCountdownHtml() {
  if (!D.countdowns.length) return '<div class="empty">暂无倒数日</div>';
  const sorted = [...D.countdowns].sort((a, b) => Math.abs(countdownDays(a)) - Math.abs(countdownDays(b)));
  return sorted.slice(0, 3).map((c) => {
    const diff = countdownDays(c);
    const txt = c.type === "anniversary" ? (diff <= 0 ? `已 ${-diff} 天` : `还有 ${-diff} 天`) : (diff >= 0 ? `还剩 ${diff} 天` : `已过 ${-diff} 天`);
    return `<div class="list-item"><span style="font-size:18px">${c.emoji || "⏳"}</span><div class="grow"><div class="title">${esc(c.title)}</div></div><span class="tag blue">${txt}</span></div>`;
  }).join("");
}
function openCountdownModal() {
  openModal(`<h3>⏳ 新增倒数日 / 纪念日</h3>
    <div class="form-row"><input id="cd-title" placeholder="标题，如：国庆节 / 妈妈生日"></div>
    <div class="form-row">
      <input id="cd-date" type="date">
      <select id="cd-type"><option value="countdown">倒数日（未来日期）</option><option value="anniversary">纪念日（已发生日期）</option></select>
    </div>
    <div class="form-row"><input id="cd-emoji" placeholder="图标 emoji（可选），如 🎂 🏖️ 💰" maxlength="4"></div>
    <div style="display:flex;gap:8px"><button class="btn" onclick="addCountdown()">保存</button><button class="btn gray" onclick="closeModal()">取消</button></div>`);
}
function addCountdown() {
  const title = $("#cd-title").value.trim();
  const date = $("#cd-date").value;
  if (!title || !date) return toast("请填写标题和日期");
  D.countdowns.push({ id: uid(), title, date, type: $("#cd-type").value, emoji: $("#cd-emoji").value.trim() });
  save(); closeModal(); renderSchedule(); toast("已添加");
}
function delCountdown(id) { tombstone(id); D.countdowns = D.countdowns.filter((x) => x.id !== id); save(); renderSchedule(); }

/* ----- 身体维度 ----- */
function measurementSectionHtml() {
  const dims = [
    { k: "chest", n: "胸围" }, { k: "waist", n: "腰围" }, { k: "armL", n: "左上臂" }, { k: "armR", n: "右上臂" },
    { k: "shoulder", n: "肩宽" }, { k: "hip", n: "臀围" }, { k: "thigh", n: "大腿" }, { k: "calf", n: "小腿" },
  ];
  const list = [...D.measurements].sort((a, b) => a.date.localeCompare(b.date));
  const fields = dims.map((d) => `<div><label class="fl">${d.n}(cm)</label><input id="m-${d.k}" type="number" step="0.1"></div>`).join("");
  const ch = list.length >= 2 ? measurementChartSvg(list) : '<div class="empty" style="padding:14px 0">记录 2 次以上维度后显示趋势</div>';
  const detail = list.length ? [...list].reverse().slice(0, 20).map((m) => {
    const cells = dims.filter((d) => m[d.k]).map((d) => `${d.n} ${m[d.k]}`).join(" · ");
    return `<div class="list-item"><span class="tag blue">${m.date.slice(5)}</span>
      <div class="grow"><div class="title">${cells || "—"}</div>${m.note ? `<div class="sub">${esc(m.note)}</div>` : ""}</div>
      <button class="icon-btn" onclick="delMeasurement('${m.id}')">✕</button></div>`;
  }).join("") : '<div class="empty">暂无维度记录</div>';
  return `
  <div class="grid cols-2" style="margin-top:16px">
    <div class="card">
      <h3>📐 身体维度记录</h3>
      <div class="grid cols-4" style="gap:8px;margin-bottom:10px">${fields}</div>
      <div class="form-row"><input id="m-date" type="date" value="${todayStr()}"><button class="btn" onclick="addMeasurement()">+ 记录维度</button></div>
    </div>
    <div class="card"><h3>📈 维度趋势（腰围 / 胸围）</h3>${ch}</div>
  </div>
  <div class="card" style="margin-top:16px"><h3>📋 维度明细</h3>${detail}</div>`;
}
function addMeasurement() {
  const dims = ["chest", "waist", "armL", "armR", "shoulder", "hip", "thigh", "calf"];
  const rec = { id: uid(), date: $("#m-date").value || todayStr(), note: "" };
  let any = false;
  dims.forEach((d) => { const v = parseFloat($("#m-" + d).value); if (v) { rec[d] = v; any = true; } });
  if (!any) return toast("请至少填一个维度");
  const exist = D.measurements.find((x) => x.date === $("#m-date").value);
  if (exist) Object.assign(exist, rec); else D.measurements.push(rec);
  save(); renderWeight(); toast("维度已记录");
}
function delMeasurement(id) { tombstone(id); D.measurements = D.measurements.filter((x) => x.id !== id); save(); renderWeight(); }
function measurementChartSvg(list) {
  const W = 340, H = 180, PL = 34, PR = 10, PT = 14, PB = 26;
  const data = list.slice(-30);
  const keys = [{ k: "waist", c: "#e11d48", n: "腰围" }, { k: "chest", c: "#4f6ef7", n: "胸围" }];
  const allv = []; data.forEach((d) => keys.forEach((k) => { if (d[k.k] != null) allv.push(d[k.k]); }));
  if (!allv.length) return '<div class="empty">无数据</div>';
  const min = Math.min(...allv) - 1, max = Math.max(...allv) + 1;
  const X = (i) => PL + (i / (Math.max(1, data.length - 1))) * (W - PL - PR);
  const Y = (v) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
  const lines = keys.map((k) => {
    const pts = data.map((d, i) => (d[k.k] != null ? `${X(i)},${Y(d[k.k])}` : null)).filter(Boolean).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="${k.c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  const legend = keys.map((k) => `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text2);margin-right:12px"><span style="width:10px;height:3px;background:${k.c};border-radius:2px;display:inline-block"></span>${k.n}</span>`).join("");
  return `<div class="chart-wrap"><svg width="100%" viewBox="0 0 ${W} ${H}" style="min-width:300px">
    ${[min, (min + max) / 2, max].map((v) => `<line x1="${PL}" y1="${Y(v)}" x2="${W - PR}" y2="${Y(v)}" stroke="#e6e9f2"/><text x="${PL - 4}" y="${Y(v) + 3}" text-anchor="end" font-size="9" fill="#6b7280">${v.toFixed(0)}</text>`).join("")}
    ${lines}</svg></div><div style="margin-top:6px">${legend}</div>`;
}

/* ----- 点菜台 ----- */
function renderKitchen() {
  const tab = kitchenTab;
  const tabs = `<div class="hot-tabs" style="margin-bottom:16px">
    <button class="hot-tab ${tab === "menu" ? "active" : ""}" onclick="kitchenTab='menu';renderKitchen()">🍽 点菜台</button>
    <button class="hot-tab ${tab === "inspire" ? "active" : ""}" onclick="kitchenTab='inspire';renderKitchen()">💡 灵感来源</button>
  </div>`;
  $("#sec-kitchen").innerHTML = tabs + (tab === "menu" ? kitchenMenuHtml() : kitchenInspireHtml());
}
function kitchenMenuHtml() {
  const s = D.settings;
  const groups = [...new Set([...DISH_GROUPS, ...D.dishes.map((d) => d.group)])];
  const grouped = groups.map((g) => {
    const items = D.dishes.filter((d) => d.group === g && (dishFilter === "all" || dishFilter === g));
    if (!items.length) return "";
    return `<div class="meal-group-title">${g}</div>` + items.map(dishRowHtml).join("");
  }).join("");
  const orderItems = curOrder.length ? curOrder.map((o, i) => `
    <div class="list-item">
      <div class="grow"><div class="title">${esc(o.name)} ${o.kcal ? `<span style="color:var(--text2);font-size:12px">≈${Math.round(o.kcal * o.qty)}kcal</span>` : ""}</div></div>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="btn sm gray" onclick="orderQty(${i},-1)">−</button>
        <span style="min-width:18px;text-align:center">${o.qty}</span>
        <button class="btn sm gray" onclick="orderQty(${i},1)">＋</button>
        <button class="icon-btn" onclick="orderRemove(${i})">✕</button>
      </div>
    </div>`).join("") : '<div class="empty">从左侧菜品库点「+」加入今日点菜单</div>';
  const orders = [...D.orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  return `
  <div class="card" style="margin-bottom:16px">
    <h3>🎯 按营养目标自动配餐</h3>
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px">根据菜品库里带营养数据的菜品，自动搭配一组最接近你目标（增肌→高蛋白 / 减脂→控热量）的菜，可一键采用。</div>
    <div class="form-row">
      <div><label class="fl">目标热量 kcal</label><input id="ap-kcal" type="number" value="${s.kcalTarget}"></div>
      <div><label class="fl">目标蛋白 g</label><input id="ap-p" type="number" value="${s.pTarget}"></div>
      <div><label class="fl">菜品数量</label><input id="ap-n" type="number" value="4" min="2" max="8"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:6px"><button class="btn" onclick="autoMealPlan()">🤖 自动配餐</button></div>
    <div id="ap-result" style="margin-top:10px"></div>
  </div>
  <div class="grid cols-2">
    <div>
      <div class="card" style="margin-bottom:16px">
        <h3>🍳 菜品库 <button class="more" onclick="openDishModal()">+ 添加菜品 ›</button></h3>
        <div class="hot-tabs" style="margin-bottom:10px">${["all", ...groups].map((g) => `<button class="hot-tab ${dishFilter === g ? "active" : ""}" onclick="dishFilter='${g}';renderKitchen()">${g === "all" ? "全部" : g}</button>`).join("")}</div>
        <div style="max-height:380px;overflow-y:auto">${grouped || '<div class="empty">还没有菜品，点右上角添加</div>'}</div>
      </div>
    </div>
    <div>
      <div class="card" style="margin-bottom:16px">
        <h3>🧾 今日点菜单 <input type="date" value="${orderDate}" style="width:auto;font-size:12px;padding:5px 8px" onchange="orderDate=this.value"></h3>
        ${orderItems}
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn" onclick="saveOrder()" ${curOrder.length ? "" : 'style="opacity:.5" disabled'}>保存点菜单</button>
          <button class="btn gray" onclick="curOrder=[];renderKitchen()">清空</button>
        </div>
      </div>
      <div class="card"><h3>📜 历史点菜单</h3>
        ${orders.length ? orders.map((o) => {
          const n = o.items.reduce((a, b) => a + b.qty, 0);
          const kcal = o.items.reduce((a, b) => a + (b.kcal || 0) * b.qty, 0);
          return `<div class="list-item"><span class="tag blue">${o.date.slice(5)}</span>
          <div class="grow"><div class="title">${o.items.map((i) => i.name).join("、")}</div><div class="sub">${n} 道${kcal ? ` · ≈${Math.round(kcal)}kcal` : ""}${o.note ? ` · ${esc(o.note)}` : ""}</div></div>
          ${o.items.some((i) => i.kcal) ? `<button class="btn sm ghost" onclick="orderToDiet('${o.id}')">记到饮食</button>` : ""}
          <button class="icon-btn" onclick="delOrder('${o.id}')">✕</button></div>`;
        }).join("") : '<div class="empty">还没有保存的点菜单</div>'}
      </div>
    </div>
  </div>`;
}
function dishRowHtml(d) {
  return `<div class="list-item">
    <div class="grow"><div class="title">${esc(d.name)}</div>
    ${d.note ? `<div class="sub">${esc(d.note)}</div>` : ""}
    ${d.kcal ? `<div class="sub">≈${d.kcal}kcal/份 · 蛋白${d.p || 0}g 碳水${d.c || 0}g 脂肪${d.f || 0}g</div>` : ""}</div>
    <button class="btn sm ghost" onclick="addToOrder('${d.id}')">+</button>
    <button class="icon-btn" onclick="delDish('${d.id}')">✕</button>
  </div>`;
}
function openDishModal() {
  openModal(`<h3>🍳 添加菜品</h3>
    <div class="form-row"><div><label class="fl">菜名</label><input id="dish-name"></div>
    <div><label class="fl">组别</label><select id="dish-group">${DISH_GROUPS.map((g) => `<option>${g}</option>`).join("")}<option value="__new">+自定义</option></select></div></div>
    <div class="form-row"><input id="dish-group-new" placeholder="自定义组别（选了+自定义时填）" style="display:none">
    <input id="dish-note" placeholder="备注/做法(可选)"></div>
    <div style="font-size:12px;color:var(--text2);margin:6px 0">每份营养（可选，填了才能「记到饮食」并估算热量）：</div>
    <div class="form-row"><div><label class="fl">热量kcal</label><input id="dish-kcal" type="number"></div><div><label class="fl">蛋白g</label><input id="dish-p" type="number"></div></div>
    <div class="form-row"><div><label class="fl">碳水g</label><input id="dish-c" type="number"></div><div><label class="fl">脂肪g</label><input id="dish-f" type="number"></div></div>
    <div style="display:flex;gap:8px"><button class="btn" onclick="saveDish()">保存</button><button class="btn gray" onclick="closeModal()">取消</button>
    <span style="flex:1"></span><button class="btn sm ghost" onclick="loadSampleDishes()">载入示例菜品</button></div>`);
  $("#dish-group").addEventListener("change", (e) => { $("#dish-group-new").style.display = e.target.value === "__new" ? "block" : "none"; });
}
function saveDish() {
  const name = $("#dish-name").value.trim();
  if (!name) return toast("请输入菜名");
  let group = $("#dish-group").value;
  if (group === "__new") group = $("#dish-group-new").value.trim() || "其他";
  const num = (id) => parseFloat($(id).value) || 0;
  D.dishes.push({ id: uid(), name, group, note: $("#dish-note").value.trim(), kcal: num("#dish-kcal") || null, p: num("#dish-p") || null, c: num("#dish-c") || null, f: num("#dish-f") || null });
  save(); closeModal(); renderKitchen(); toast("已添加菜品");
}
function addToOrder(id) {
  const d = D.dishes.find((x) => x.id === id); if (!d) return;
  const ex = curOrder.find((o) => o.name === d.name);
  if (ex) ex.qty++; else curOrder.push({ name: d.name, qty: 1, kcal: d.kcal || 0, p: d.p || 0, c: d.c || 0, f: d.f || 0 });
  renderKitchen();
}
function orderQty(i, dx) { curOrder[i].qty = Math.max(1, curOrder[i].qty + dx); renderKitchen(); }
function orderRemove(i) { curOrder.splice(i, 1); renderKitchen(); }
function saveOrder() {
  if (!curOrder.length) return toast("点菜单是空的");
  D.orders.push({ id: uid(), date: orderDate, items: curOrder.map((o) => ({ ...o })), note: "" });
  curOrder = []; save(); renderKitchen(); toast("点菜单已保存");
}
function delOrder(id) { tombstone(id); D.orders = D.orders.filter((x) => x.id !== id); save(); renderKitchen(); }
function orderToDiet(id) {
  const o = D.orders.find((x) => x.id === id); if (!o) return;
  let n = 0;
  o.items.forEach((it) => { if (it.kcal) { D.meals.push({ id: uid(), date: o.date, meal: "午餐", name: it.name, grams: 0, kcal: it.kcal * it.qty, p: it.p * it.qty, c: it.c * it.qty, f: it.f * it.qty }); n++; } });
  save(); toast(n ? `已把 ${n} 道含营养菜品记入饮食(${o.date})` : "该点菜单没有可记入的营养数据");
}
function delDish(id) { tombstone(id); D.dishes = D.dishes.filter((x) => x.id !== id); save(); renderKitchen(); }
function loadSampleDishes() {
  const doLoad = () => {
    const samples = [
      { name: "凉拌黄瓜", group: "凉菜", note: "蒜末+醋", kcal: 60, p: 2, c: 8, f: 2 },
      { name: "西红柿炒蛋", group: "热菜", kcal: 180, p: 9, c: 10, f: 12 },
      { name: "青椒肉丝", group: "热菜", kcal: 240, p: 18, c: 8, f: 15 },
      { name: "清蒸鲈鱼", group: "海鲜河鲜", kcal: 160, p: 26, c: 0, f: 6 },
      { name: "红烧鸡腿", group: "家常菜", kcal: 320, p: 22, c: 6, f: 22 },
      { name: "白米饭", group: "主食面点", kcal: 230, p: 5, c: 50, f: 1 },
      { name: "番茄牛腩面", group: "主食面点", kcal: 520, p: 22, c: 70, f: 16 },
      { name: "紫菜蛋花汤", group: "汤羹", kcal: 70, p: 5, c: 4, f: 4 },
      { name: "烤鸡胸沙拉", group: "热菜", kcal: 260, p: 35, c: 10, f: 9 },
      { name: "燕麦牛奶杯", group: "早餐", kcal: 300, p: 14, c: 45, f: 8 },
      { name: "美式咖啡", group: "饮品", kcal: 5, p: 0, c: 1, f: 0 },
      { name: "酸奶杯", group: "甜点", kcal: 150, p: 8, c: 18, f: 5 },
    ];
    samples.forEach((s) => D.dishes.push({ id: uid(), name: s.name, group: s.group, note: s.note, kcal: s.kcal, p: s.p, c: s.c, f: s.f }));
    save(); closeModal(); renderKitchen(); toast("已载入 " + samples.length + " 道示例菜品");
  };
  if (D.dishes.length) { appConfirm("已存在菜品，仍要追加示例菜品吗？", doLoad); return; }
  doLoad();
}

/* ----- 按营养目标自动配餐 ----- */
function autoMealPlan() {
  const s = D.settings;
  const Tk = parseFloat($("#ap-kcal").value) || s.kcalTarget;
  const Tp = parseFloat($("#ap-p").value) || s.pTarget;
  const maxN = Math.min(8, Math.max(2, parseInt($("#ap-n").value) || 4));
  const pool = D.dishes.filter((d) => d.kcal && d.p != null);
  if (pool.length < 2) return toast("带营养数据的菜品太少，先到「菜品库」添加含营养的菜品");
  const wK = 1, wP = 2;
  const err = (sel) => {
    const k = sel.reduce((a, b) => a + b.kcal, 0);
    const p = sel.reduce((a, b) => a + b.p, 0);
    let e = wK * Math.pow((k - Tk) / Tk, 2) + wP * Math.pow((p - Tp) / Tp, 2);
    const uniq = new Set(sel.map((x) => x.group)).size;
    e += 0.08 * (maxN - uniq);
    return e;
  };
  let best = [];
  for (let it = 0; it < 600; it++) {
    const order = [...pool].sort(() => Math.random() - 0.5);
    const sel = []; let curErr = Infinity;
    for (const d of order) {
      if (sel.length >= maxN) break;
      const trial = err([...sel, d]);
      if (trial < curErr) { sel.push(d); curErr = trial; }
    }
    if (!best.length || err(sel) < err(best)) best = sel;
  }
  if (!best.length) return toast("未找到合适搭配");
  lastAutoPlan = best;
  renderAutoPlan(best, Tk, Tp);
}
function renderAutoPlan(sel, Tk, Tp) {
  const k = sel.reduce((a, b) => a + b.kcal, 0);
  const p = sel.reduce((a, b) => a + b.p, 0);
  const c = sel.reduce((a, b) => a + (b.c || 0), 0);
  const f = sel.reduce((a, b) => a + (b.f || 0), 0);
  const chk = (v, t) => Math.abs(v - t) / t <= 0.15 ? '<span class="tag lo">达标✅</span>' : '<span class="tag hi">偏差</span>';
  $("#ap-result").innerHTML = `
    <div class="list-item" style="background:var(--bg)">
      <div class="grow"><div class="title">合计 ${Math.round(k)} kcal / 蛋白 ${Math.round(p)}g / 碳水 ${Math.round(c)}g / 脂肪 ${Math.round(f)}g</div>
      <div class="sub">目标 ${Tk}kcal · 蛋白 ${Tp}g ｜ 热量 ${chk(k, Tk)} 蛋白 ${chk(p, Tp)}</div></div>
    </div>
    ${sel.map((d) => `<div class="list-item"><div class="grow"><div class="title">${esc(d.name)} <span class="tag teal">${esc(d.group)}</span></div>
      <div class="sub">≈${Math.round(d.kcal)}kcal · 蛋白${d.p}g 碳水${d.c || 0}g 脂肪${d.f || 0}g</div></div></div>`).join("")}
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn" onclick="applyAutoPlan()">采用并加入点菜单</button>
      <button class="btn ghost" onclick="dietAutoPlan()">记到饮食</button>
    </div>`;
}
function applyAutoPlan() {
  if (!lastAutoPlan.length) return toast("先点「自动配餐」生成方案");
  lastAutoPlan.forEach((d) => {
    const ex = curOrder.find((o) => o.name === d.name);
    if (ex) ex.qty++; else curOrder.push({ name: d.name, qty: 1, kcal: d.kcal || 0, p: d.p || 0, c: d.c || 0, f: d.f || 0 });
  });
  renderKitchen(); toast("已采用配餐方案到今日点菜单");
}
function dietAutoPlan() {
  if (!lastAutoPlan.length) return toast("先点「自动配餐」生成方案");
  let n = 0;
  lastAutoPlan.forEach((d) => { if (d.kcal) { D.meals.push({ id: uid(), date: todayStr(), meal: "午餐", name: d.name, grams: 0, kcal: d.kcal, p: d.p || 0, c: d.c || 0, f: d.f || 0 }); n++; } });
  save(); toast(n ? `已把 ${n} 道菜记入今日饮食` : "方案无可记入的营养数据");
}

/* ----- 灵感来源 ----- */
function kitchenInspireHtml() {
  return `
  <div class="grid cols-2">
    <div>
      <div class="card" style="margin-bottom:16px">
        <h3>💡 灵感来源 · 输入食材自动生成菜单</h3>
        <textarea id="ing-input" rows="4" placeholder="输入你手头的食材，用空格/逗号分隔，如：鸡胸肉 西兰花 鸡蛋 米饭 番茄">${esc(inspireText)}</textarea>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button class="btn" onclick="genInspire()">🔍 本地菜谱匹配</button>
          <button class="btn ghost" onclick="genInspireAI()" id="inspire-ai-btn">🤖 AI 出题谱+做法</button>
          <button class="btn ghost" onclick="randomMenu()">🎲 随机搭配</button>
          <button class="btn ghost sm" onclick="showSetupGuide('ai')">📖 AI 指引</button>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-top:8px">「本地匹配」用内置菜谱库秒出；「AI 出题谱+做法」会调用你在设置里配的多模态接口，按手头食材生成带步骤的菜谱与还差食材。</div>
        <div id="inspire-result" style="margin-top:10px"></div>
      </div>
    </div>
    <div class="card">
      <h3>🍱 今日推荐搭配</h3>
      <div id="menu-suggest">${menuSuggestHtml()}</div>
    </div>
  </div>`;
}
function genInspire() {
  inspireText = $("#ing-input").value.trim();
  const ings = inspireText.split(/[\s,，;；、]+/).filter(Boolean).map((s) => s.trim());
  if (!ings.length) return toast("请输入食材");
  const scored = RECIPE_DB.map((r) => {
    const hit = r.ingredients.filter((ri) => ings.some((u) => u.includes(ri) || ri.includes(u)));
    return { r, hit, score: hit.length };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  const box = $("#inspire-result");
  if (!scored.length) { box.innerHTML = '<div class="empty">没匹配到现成菜谱，换个食材或看右侧推荐搭配</div>'; return; }
  box.innerHTML = scored.slice(0, 12).map(({ r, hit }) => {
    const missing = r.ingredients.filter((ri) => !ings.some((u) => u.includes(ri) || ri.includes(u)));
    return `<div class="list-item">
      <div class="grow"><div class="title">${esc(r.name)} <span class="tag teal">${r.group}</span></div>
      <div class="sub">用上：${hit.join("、")}${missing.length ? ` · 还差：${missing.join("、")}` : " · 食材齐全✅"}</div></div>
      ${missing.length ? `<button class="btn sm ghost" onclick="inspireToShop(${jsStr(r.name)},${jsStr(missing)})">加入购物</button>` : ""}
    </div>`;
  }).join("");
}
function inspireToShop(name, missing) {
  if (!Array.isArray(missing)) missing = [missing];
  let n = 0;
  missing.forEach((m) => { if (m && !D.shopping.some((s) => s.name === m)) { D.shopping.push({ id: uid(), name: m, url: "", platform: "其他", status: "want", price: 0, note: "来自菜谱：" + name }); n++; } });
  save(); toast(n ? `已将 ${n} 种缺料加入购物清单` : "缺料已在清单中");
}
function buildMenu() {
  const pick = (grp) => { const arr = RECIPE_DB.filter((r) => r.group === grp); return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; };
  return [pick("主食"), pick("蛋白质"), pick("蔬菜"), pick("汤羹")].filter(Boolean);
}
function menuSuggestHtml() {
  const menu = buildMenu();
  return menu.length ? `<div>${menu.map((r) => `<div class="list-item"><span class="tag purple">${esc(r.group)}</span>
    <div class="grow"><div class="title">${esc(r.name)}</div><div class="sub">${r.ingredients.join("、")} · 约${r.time}</div></div>
    <button class="btn sm ghost" onclick="inspireToShop(${jsStr(r.name)},${jsStr(r.ingredients)})">加购物</button></div>`).join("")}
    <div style="font-size:12px;color:var(--text2);margin-top:6px">🎲 点「随机搭配」可换一套</div></div>`
    : '<div class="empty">菜谱库为空</div>';
}
function randomMenu() { const box = $("#menu-suggest"); if (box) box.innerHTML = menuSuggestHtml(); }

/* ----- AI 出题谱 + 做法 ----- */
async function genInspireAI() {
  const s = D.settings;
  if (!(s.aiBase && s.aiKey && s.aiModel)) { toast("请先到 设置 中配置 AI 接口"); go("settings"); return; }
  const ings = $("#ing-input").value.trim();
  if (!ings) return toast("请先在上方输入你手头的食材");
  const btn = $("#inspire-ai-btn"); if (btn) btn.disabled = true;
  const box = $("#inspire-result");
  box.innerHTML = '<div class="empty">🤖 AI 正在生成菜谱与做法，请稍候…</div>';
  try {
    const prompt = `你是一位专业健身营养师兼家常菜厨师。请用以下食材设计菜谱：${ings}。\n要求：1) 充分利用已有食材，尽量少用额外食材；2) 适合增肌减脂（高蛋白、适量碳水、低油）；3) 给出具体、可操作的步骤。\n只返回 JSON 数组（不要任何额外文字、不要 markdown 代码块），最多 4 个菜谱，每个元素格式：\n{"name":"菜名","group":"类别(如 热菜/汤羹/主食)","ingredients":["用到的主要食材"],"missing":["需要额外购买的食材"],"steps":["步骤1","步骤2"...],"kcal":整数,"p":蛋白质g,"c":碳水g,"f":脂肪g}`;
    let txt = await aiChat(prompt, { temperature: 0.6 });
    txt = txt.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
    const m = txt.match(/\[[\s\S]*\]/);
    const recipes = JSON.parse(m ? m[0] : txt);
    if (!Array.isArray(recipes) || !recipes.length) throw new Error("AI 未生成菜谱");
    box.innerHTML = recipes.map(aiRecipeCard).join("");
  } catch (e) {
    box.innerHTML = '<div class="empty">AI 生成失败：' + esc(e.message) + '（可检查设置中的 AI 配置，或换个说法重试）</div>';
  } finally {
    if (btn) btn.disabled = false;
  }
}
function aiRecipeCard(r) {
  const name = r.name || "未命名菜谱";
  const steps = Array.isArray(r.steps) ? r.steps.map((s) => `<li>${esc(s)}</li>`).join("") : "";
  const miss = Array.isArray(r.missing) ? r.missing.filter(Boolean) : [];
  const ing = Array.isArray(r.ingredients) ? r.ingredients.map(esc).join("、") : "";
  const mac = (r.kcal || r.p != null) ? `<div class="sub">≈${Math.round(r.kcal || 0)}kcal · 蛋白${r.p || 0}g 碳水${r.c || 0}g 脂肪${r.f || 0}g</div>` : "";
  return `<div class="card" style="margin:10px 0;box-shadow:none">
    <div class="title" style="font-size:15px">🍽 ${esc(name)} ${r.group ? `<span class="tag teal">${esc(r.group)}</span>` : ""}</div>
    ${ing ? `<div class="sub" style="margin-top:4px">食材：${ing}</div>` : ""}
    ${mac}
    ${steps ? `<div style="font-size:13px;margin-top:8px"><b>做法</b><ol style="margin:6px 0 0;padding-left:20px;line-height:1.8">${steps}</ol></div>` : ""}
    ${miss.length ? `<div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap"><span class="tag orange">还差：${miss.map(esc).join("、")}</span><button class="btn sm ghost" onclick="inspireToShop(${jsStr(name)},${jsStr(miss)})">加入购物清单</button></div>` : ""}
  </div>`;
}

/* ----- SOP 流程 ----- */
function renderSop() {
  const cats = [...new Set(D.sops.map((s) => s.cat || "未分类"))];
  const list = sopFilter === "all" ? D.sops : D.sops.filter((s) => s.cat === sopFilter);
  $("#sec-sop").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <div class="form-row">
      <input id="sop-title" placeholder="SOP 名称，如：周报撰写流程" style="flex:2">
      <input id="sop-cat" placeholder="分类，如：工作/生活/健身" style="flex:1">
    </div>
    <label class="fl">步骤（每行一个）</label>
    <textarea id="sop-steps" rows="5" placeholder="1. 收集本周数据&#10;2. 整理成图表&#10;3. 写结论与下周计划"></textarea>
    <div class="form-row" style="margin-top:8px"><input id="sop-note" placeholder="补充说明(可选)"><button class="btn" onclick="addSop()">+ 保存 SOP</button></div>
    <div style="font-size:12px;color:var(--text2)">提示：可随时「复制」整套步骤，或「载入示例」参考结构。</div>
  </div>
  <div class="hot-tabs" style="margin-bottom:14px">${["all", ...cats].map((c) => `<button class="hot-tab ${sopFilter === c ? "active" : ""}" onclick="sopFilter='${c}';renderSop()">${c === "all" ? "全部" : c}</button>`).join("")}<span style="flex:1"></span><button class="btn sm ghost" onclick="loadSampleSops()">载入示例</button></div>
  <div class="grid cols-2">
    ${list.length ? list.map(sopCardHtml).join("") : '<div class="empty" style="grid-column:1/-1">还没有 SOP，先添加一条吧</div>'}
  </div>`;
}
function sopCardHtml(s) {
  const steps = (s.steps || []).map((t, i) => `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px dashed var(--line);font-size:13px"><span style="flex:none;width:22px;height:22px;border-radius:50%;background:var(--primary-soft);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${i + 1}</span><span style="flex:1">${esc(t)}</span></div>`).join("") || '<div class="empty">无步骤</div>';
  return `<div class="card">
    <h3 style="display:flex;align-items:center;gap:6px"><span class="tag purple">${esc(s.cat || "未分类")}</span><span style="flex:1">${esc(s.title)}</span>
      <button class="btn sm ghost" onclick="copySop('${s.id}')">复制</button>
      <button class="icon-btn" onclick="delSop('${s.id}')">✕</button></h3>
    <div style="margin:6px 0">${steps}</div>
    ${s.note ? `<div style="font-size:12px;color:var(--text2)">📝 ${esc(s.note)}</div>` : ""}
  </div>`;
}
function addSop() {
  const title = $("#sop-title").value.trim();
  if (!title) return toast("请输入 SOP 名称");
  const steps = $("#sop-steps").value.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  D.sops.push({ id: uid(), title, cat: $("#sop-cat").value.trim() || "未分类", steps, note: $("#sop-note").value.trim() });
  save(); renderSop(); toast("SOP 已保存");
}
function delSop(id) { tombstone(id); D.sops = D.sops.filter((x) => x.id !== id); save(); renderSop(); }
function copySop(id) {
  const s = D.sops.find((x) => x.id === id); if (!s) return;
  const txt = `【${s.title}】(${s.cat})\n` + (s.steps || []).map((t, i) => `${i + 1}. ${t}`).join("\n") + (s.note ? `\n备注：${s.note}` : "");
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast("已复制 SOP 全文")).catch(() => toast("复制失败，请手动选择"));
  else toast("当前环境不支持自动复制");
}
function loadSampleSops() {
  const doLoad = () => {
    const samples = [
      { title: "晨间流程", cat: "生活", steps: ["起床喝一杯温水", "称重+记录身体维度", "拉伸 10 分钟", "吃高蛋白早餐", "列今日待办"], note: "保持节奏稳定" },
      { title: "健身训练日", cat: "健身", steps: ["动态热身 5 分钟", "力量训练（按分化）", "有氧 20 分钟", "补充蛋白质", "记录训练与饮食"], note: "训练后 30 分钟内补充蛋白" },
      { title: "周报撰写", cat: "工作", steps: ["汇总本周完成事项", "整理数据图表", "写结论与风险", "规划下周目标", "发送并归档"], note: "" },
    ];
    samples.forEach((s) => D.sops.push({ id: uid(), title: s.title, cat: s.cat, steps: s.steps, note: s.note }));
    save(); renderSop(); toast("已载入示例 SOP");
  };
  if (D.sops.length) { appConfirm("已存在 SOP，仍要追加示例吗？", doLoad); return; }
  doLoad();
}

/* ----- 购物清单 ----- */
const SHOP_STATUS = [["want", "想要"], ["cart", "已加购"], ["bought", "已购买"]];
function renderShopping() {
  const list = shopFilter === "all" ? D.shopping : [...D.shopping].filter((s) => s.status === shopFilter);
  const counts = { want: 0, cart: 0, bought: 0 };
  D.shopping.forEach((s) => counts[s.status] = (counts[s.status] || 0) + 1);
  const totalBought = D.shopping.filter((s) => s.status === "bought").reduce((a, b) => a + (+b.price || 0), 0);
  $("#sec-shopping").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <h3>🛒 从电商平台导入链接 <button class="more" onclick="showSetupGuide('shop')">📖 图文指引 ›</button></h3>
    <label class="fl">粘贴链接（支持淘宝/天猫、京东、拼多多、抖音、小红书；多个链接换行分隔）</label>
    <textarea id="shop-links" rows="3" placeholder="https://item.taobao.com/...&#10;https://item.jd.com/...&#10;https://mobile.yangkeduo.com/..."></textarea>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
      <button class="btn" onclick="importLinks()">⬇ 解析并导入</button>
      <span style="flex:1"></span>
      <button class="btn sm ghost" onclick="openManualShop()">+ 手动添加</button>
    </div>
  </div>
  <div class="grid cols-3" style="margin-bottom:16px">
    <div class="card stat"><div class="v" style="color:var(--text2)">${D.shopping.length}</div><div class="l">清单总数</div></div>
    <div class="card stat"><div class="v" style="color:var(--orange)">${counts.want}</div><div class="l">想要</div></div>
    <div class="card stat"><div class="v" style="color:var(--green)">${fmtMoney(totalBought)}</div><div class="l">已购合计</div></div>
  </div>
  <div class="hot-tabs" style="margin-bottom:14px">${[["all", "全部"], ...SHOP_STATUS].map(([k, n]) => `<button class="hot-tab ${shopFilter === k ? "active" : ""}" onclick="shopFilter='${k}';renderShopping()">${n}</button>`).join("")}</div>
  <div class="grid cols-2">
    ${list.length ? list.map(shopCardHtml).join("") : '<div class="empty" style="grid-column:1/-1">清单是空的，粘贴链接或手动添加</div>'}
  </div>`;
}
function shopCardHtml(s) {
  const platColor = { "淘宝/天猫": "#ff5000", "京东": "#e1251b", "拼多多": "#e02e24", "抖音": "#111111", "小红书": "#ff2442", "其他": "#6b7280" }[s.platform] || "#6b7280";
  return `<div class="card">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:11px;padding:2px 8px;border-radius:99px;color:#fff;background:${platColor}">${esc(s.platform)}</span>
      ${s.price ? `<b style="color:var(--red);font-size:13px">${fmtMoney(s.price)}</b>` : ""}
      <span style="flex:1"></span>
      <button class="icon-btn" onclick="delShop('${s.id}')">✕</button>
    </div>
    <div class="title" style="font-size:15px;font-weight:600;word-break:break-all">${esc(s.name)}</div>
    ${s.url ? `<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener" style="font-size:12px;color:var(--primary);word-break:break-all;display:block;margin-top:4px">打开链接 ↗</a>` : ""}
    ${s.note ? `<div class="sub" style="margin-top:4px">${esc(s.note)}</div>` : ""}
    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
      ${SHOP_STATUS.map(([k, n]) => `<button class="btn sm ${s.status === k ? "" : "gray"}" style="${s.status === k ? `background:${platColor};color:#fff` : ""}" onclick="setShopStatus('${s.id}','${k}')">${n}</button>`).join("")}
    </div>
  </div>`;
}
async function importLinks() {
  const raw = $("#shop-links").value.trim();
  if (!raw) return toast("请粘贴链接");
  const urls = raw.split(/\s+/).map((s) => s.trim()).filter(Boolean).filter((u) => /^https?:\/\//.test(u));
  if (!urls.length) return toast("没有识别到有效链接（需以 http 开头）");
  const needAi = [];
  urls.forEach((u) => {
    const plat = detectPlatform(u);
    let name = plat + " 商品";
    const m = u.match(/[?&](?:title|item|id|sku|goods_id)=([^&]+)/i);
    if (m) try { name = decodeURIComponent(m[1].replace(/\+/g, " ")).slice(0, 30); } catch (e) {}
    const item = { id: uid(), name, url: u, platform: plat, status: "want", price: 0, note: "" };
    D.shopping.push(item);
    if (name === plat + " 商品") needAi.push(item);
  });
  save();
  renderShopping();
  toast(`已导入 ${urls.length} 条商品` + (needAi.length ? "，正在用 AI 猜测商品名…" : ""));
  if (needAi.length && aiReady()) {
    for (const it of needAi) {
      try {
        const txt = await aiChat("从以下商品链接中提取商品名称，只返回商品名本身（不要任何其它文字，最多20字）：" + it.url, { temperature: 0.2 });
        const nm = txt.replace(/[\r\n""]/g, "").trim().slice(0, 30);
        if (nm && nm.length > 1) it.name = nm;
      } catch (e) {}
    }
    save(); renderShopping();
  } else if (needAi.length) {
    toast("部分商品名未识别，配置 AI 接口后可自动猜测");
  }
}
function openManualShop() {
  openModal(`<h3>🛒 手动添加商品</h3>
    <div class="form-row"><input id="ms-name" placeholder="商品名"></div>
    <div class="form-row"><select id="ms-plat">${SHOP_PLATFORMS.map((p) => `<option>${p}</option>`).join("")}</select><input id="ms-price" type="number" placeholder="价格(可选)"></div>
    <div class="form-row"><input id="ms-url" placeholder="链接(可选)"><input id="ms-note" placeholder="备注(可选)"></div>
    <div style="display:flex;gap:8px"><button class="btn" onclick="saveManualShop()">保存</button><button class="btn gray" onclick="closeModal()">取消</button></div>`);
}
function saveManualShop() {
  const name = $("#ms-name").value.trim(); if (!name) return toast("请输入商品名");
  D.shopping.push({ id: uid(), name, url: $("#ms-url").value.trim(), platform: $("#ms-plat").value, status: "want", price: parseFloat($("#ms-price").value) || 0, note: $("#ms-note").value.trim() });
  save(); closeModal(); renderShopping(); toast("已添加");
}
function setShopStatus(id, st) { const s = D.shopping.find((x) => x.id === id); if (s) { s.status = st; save(); renderShopping(); } }
function delShop(id) { tombstone(id); D.shopping = D.shopping.filter((x) => x.id !== id); save(); renderShopping(); }

/* ================= 安装 / 下载（PWA） ================= */
let deferredPrompt = null;
function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}
function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const dl = $("#dl-btn"); if (dl) dl.classList.add("ready");
});
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  const dl = $("#dl-btn"); if (dl) dl.classList.remove("ready");
  toast("✅ 已安装到设备");
});
async function installApp() {
  if (!deferredPrompt) { toast("当前浏览器未提供一键安装，请按菜单手动安装"); return; }
  deferredPrompt.prompt();
  try { await deferredPrompt.userChoice; } catch (e) {}
  deferredPrompt = null;
  const dl = $("#dl-btn"); if (dl) dl.classList.remove("ready");
}
function openDownloadModal() {
  if (isMobile()) {
    openModal(`<h3>📲 下载 App（安装到手机）</h3>
      <div style="font-size:13px;line-height:1.9;color:var(--text2);margin-bottom:10px">把工作台装到手机，像原生 App 一样全屏使用、离线可用：</div>
      ${deferredPrompt ? `<div style="margin:6px 0 12px"><button class="btn" onclick="installApp();closeModal()">⚡ 一键安装到主屏</button></div>` : ""}
      <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:1.9">
        <div><b>🤖 Android（Chrome / Edge / 华为浏览器）</b><br>点右上角 ⋮ 菜单 → <b>“安装应用”</b> 或“添加到主屏幕” → 确认即可。</div>
        <div><b>🍎 iPhone / iPad（Safari）</b><br>点底部 <b>分享 ⬆︎</b> → 选 <b>“添加到主屏幕”</b> → 确认名称后“添加”。</div>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:12px">首次“添加到主屏幕”后，从桌面图标打开即为全屏 App 体验。</div>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn gray" onclick="closeModal()">知道了</button><button class="btn ghost" onclick="closeModal();showSetupGuide('install')">📖 图文步骤</button></div>`);
  } else {
    openModal(`<h3>💻 下载软件（PC 桌面版）</h3>
      <div style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:12px">本工作台是网页应用，提供两种“下载到电脑”的方式：</div>
      <div class="grid cols-2" style="gap:12px">
        <div class="card" style="box-shadow:none">
          <h3 style="font-size:15px">🪟 安装为桌面应用</h3>
          <div style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:10px">在 Chrome / Edge 中把本页安装为独立窗口应用，开机即用、可固定到任务栏。</div>
          ${deferredPrompt ? `<button class="btn" onclick="installApp();closeModal()">⚡ 一键安装</button>` : `<div style="font-size:13px">点地址栏右侧 <b>⊕“安装”</b> 图标，或浏览器菜单 → “安装工作台”。</div>`}
        </div>
        <div class="card" style="box-shadow:none">
          <h3 style="font-size:15px">📦 下载离线版（单文件）</h3>
          <div style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:10px">下载一个 <b>standalone.html</b> 单文件，双击即可离线打开，不依赖网络（热点/AI 等联网功能除外）。</div>
          <button class="btn" onclick="downloadStandalone()">⬇ 下载 standalone.html</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn gray" onclick="closeModal()">关闭</button><button class="btn ghost" onclick="closeModal();showSetupGuide('install')">📖 图文步骤</button></div>`);
  }
}
function downloadStandalone() {
  closeModal();
  toast("正在下载离线版…");
  const a = document.createElement("a");
  a.href = "standalone.html";
  a.download = "生活工作台-离线版.html";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => toast("⬇ 已开始下载 standalone.html"), 400);
}

/* ================= v1.9.0 新增功能 ================= */

/* ----- AI 对话记忆 ----- */
function pushAiMemory(kind, text) {
  if (!text || !text.trim()) return;
  D.aiMemory = D.aiMemory || [];
  D.aiMemory.push({ ts: Date.now(), kind: kind || "review", text: String(text).slice(0, 600) });
  if (D.aiMemory.length > 30) D.aiMemory = D.aiMemory.slice(-30);
  save(true);
}
function aiMemoryContext() {
  const m = D.aiMemory || [];
  if (!m.length) return "";
  return "\n\n【你之前关注过的重点（连续追踪用，来自历史复盘 / 晨报 / 目标拆解）】\n" +
    m.slice(-8).map((x) => "- [" + x.kind + "] " + x.text).join("\n");
}

/* ----- AI 每日晨报 ----- */
function openMorningBrief() {
  if (!aiReady()) { toast("请先在「设置 / 同步」配置 AI 接口"); go("settings"); return; }
  openModal(`<h3>🤖 AI 每日晨报</h3>
    <div class="tool-sub">基于今天的待办 / 习惯 / 预算 / 学习计划，生成当天建议。</div>
    <div id="mb-result" class="tool-result" style="display:block;text-align:left"></div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn" id="mb-run" onclick="runMorningBrief()">☀️ 生成今日晨报</button>
      <button class="btn gray" onclick="closeModal()">关闭</button>
    </div>`);
}
async function runMorningBrief() {
  const t = todayStr();
  const open = D.todos.filter((x) => !x.done);
  const habitsTodo = (D.habits || []).filter((h) => !(h.history || {})[t]).map((h) => h.name);
  const exp = D.money.filter((x) => x.date.startsWith(monthStr()) && x.type === "支出").reduce((a, b) => a + b.amount, 0);
  const bud = D.moneyBudgets[monthStr()];
  const studyToday = D.study.filter((x) => x.date === t).reduce((a, b) => a + (b.minutes || 0), 0);
  const prompt = `你是一位贴身生活教练。今天是 ${t}。请给「今日晨报」：
【未完成待办】${open.length ? open.slice(0, 8).map((x) => x.text).join("、") : "无"}
【今天还没打卡的习惯】${habitsTodo.length ? habitsTodo.join("、") : "已全部打卡👍"}
【本月支出】${fmtMoney(exp)}${bud ? " / 预算 " + fmtMoney(bud) + " 剩余 " + fmtMoney(bud - exp) : ""}
【今日已学习】${studyToday} 分钟
请给出：1) 今天最重要的 3 件事；2) 习惯打卡提醒；3) 一条饮食 / 身体小建议；4) 一句鼓励。控制在 300 字内，语气像朋友。` + aiMemoryContext();
  const box = $("#mb-result"); if (box) box.innerHTML = '<div class="empty">🤖 正在生成…</div>';
  const btn = $("#mb-run"); if (btn) btn.disabled = true;
  try {
    const txt = await aiChat(prompt, { temperature: 0.6 });
    pushAiMemory("morning", txt.slice(0, 200));
    if (box) box.innerHTML = `<div class="md">${mdLite(txt)}</div><div style="margin-top:10px"><button class="btn sm" onclick="mbSavePlan()">📝 存入今日计划</button></div>`;
    window.__mbTxt = txt;
  } catch (e) { if (box) box.innerHTML = '<div class="empty">生成失败：' + esc(e.message) + '（检查 AI 配置）</div>'; }
  finally { if (btn) btn.disabled = false; }
}
function mbSavePlan() {
  if (!window.__mbTxt) return toast("还没有晨报内容");
  const t = todayStr();
  D.plans.daily[t] = (D.plans.daily[t] ? D.plans.daily[t] + "\n\n" : "") + "【AI 晨报 · " + t + "】\n" + window.__mbTxt;
  save(true); toast("已存入今日计划 📝");
}

/* ----- AI 目标拆解 ----- */
function openGoalDecompose() {
  if (!aiReady()) { toast("请先在「设置 / 同步」配置 AI 接口"); go("settings"); return; }
  openModal(`<h3>🎯 AI 目标拆解</h3>
    <div class="tool-sub">输入一个目标，AI 帮你拆成待办 / 习惯 / 计划。</div>
    <textarea id="gd-goal" rows="3" placeholder="例如：三个月减重 5 斤 / 两个月考过注会 / 每天坚持阅读"></textarea>
    <div id="gd-result" class="tool-result" style="display:block;text-align:left"></div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn" id="gd-run" onclick="runGoalDecompose()">🤖 拆解目标</button>
      <button class="btn gray" onclick="closeModal()">关闭</button>
    </div>`);
}
async function runGoalDecompose() {
  const goal = $("#gd-goal").value.trim();
  if (!goal) return toast("请先输入目标");
  const prompt = `你是目标拆解教练。用户目标：「${goal}」。
请输出结构化拆解：
1)【待办】3-5 条具体可执行的第一步行动（每条一行，用 - 开头）
2)【习惯】建议培养的 1-3 个日常习惯（每条一行，用 * 开头）
3)【计划要点】一段话总结关键节奏与里程碑
控制在 400 字内，务实、可量化。` + aiMemoryContext();
  const box = $("#gd-result"); if (box) box.innerHTML = '<div class="empty">🤖 正在拆解…</div>';
  const btn = $("#gd-run"); if (btn) btn.disabled = true;
  try {
    const txt = await aiChat(prompt, { temperature: 0.5 });
    pushAiMemory("goal", goal + " → " + txt.slice(0, 120));
    if (box) box.innerHTML = `<div class="md">${mdLite(txt)}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn sm" onclick="gdExtractTodos()">✅ 提取待办</button>
        <button class="btn sm ghost" onclick="gdSavePlan()">📝 存入今日计划</button>
      </div>`;
    window.__gdTxt = txt;
  } catch (e) { if (box) box.innerHTML = '<div class="empty">拆解失败：' + esc(e.message) + '</div>'; }
  finally { if (btn) btn.disabled = false; }
}
function gdExtractTodos() {
  const txt = window.__gdTxt || "";
  const lines = txt.split(/\r?\n/).filter((l) => /^[-•·]/.test(l.trim())).map((l) => l.replace(/^[-•·]\s*/, "").trim()).filter(Boolean);
  if (!lines.length) return toast("没找到可提取的待办（以 - / • 开头的行）");
  let n = 0;
  lines.forEach((t) => { D.todos.push({ id: uid(), text: t, pri: "中", done: false, created: Date.now() }); n++; });
  save(); toast("已添加 " + n + " 条待办");
}
function gdSavePlan() {
  const txt = window.__gdTxt || "";
  if (!txt) return toast("还没有拆解结果");
  const t = todayStr();
  D.plans.daily[t] = (D.plans.daily[t] ? D.plans.daily[t] + "\n\n" : "") + "【AI 目标拆解】\n" + txt;
  save(true); toast("已存入今日计划 📝");
}

/* ----- 周期性账单自动入账 ----- */
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function nextOcc(dateStr, cycle, anchorDay) {
  let d = new Date(dateStr + "T00:00:00");
  if (cycle === "day") d.setDate(d.getDate() + 1);
  else if (cycle === "week") d.setDate(d.getDate() + 7);
  else if (cycle === "month") { d.setMonth(d.getMonth() + 1); if (anchorDay) d.setDate(Math.min(anchorDay, daysInMonth(d))); }
  else if (cycle === "year") d.setFullYear(d.getFullYear() + 1);
  return fmtDate(d);
}
function processRecurringBills() {
  if (!D.recurringBills || !D.recurringBills.length) return;
  const today = todayStr();
  let added = 0;
  D.recurringBills.forEach((b) => {
    const anchorDay = b.anchor ? new Date(b.anchor + "T00:00:00").getDate() : 0;
    let last = b.lastRun || b.anchor || today;
    if (last > today) return;
    let guard = 0;
    while (guard < 500) {
      const nx = nextOcc(last, b.cycle, anchorDay);
      if (nx > today) break;
      if (nx !== b.lastRun) {
        D.money.push({ id: uid(), date: nx, type: b.type || "支出", cat: b.cat, amount: b.amount, note: (b.note || b.cat) + "（周期）", recurringId: b.id });
        added++;
      }
      b.lastRun = nx; last = nx; guard++;
    }
  });
  if (added) { save(true); toast("🔁 已自动记入 " + added + " 笔周期账单"); }
}

/* ----- 全量数据导出 / 导入 ----- */
function exportAllData() {
  const blob = new Blob([JSON.stringify(D, null, 2)], { type: "application/json" });
  downloadFile("workbench-全部数据-" + todayStr() + ".json", blob, "application/json");
  toast("已导出全部数据");
}
function importAllData() {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "application/json";
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        appConfirm("导入将覆盖当前全部数据（建议先点「导出全部数据」备份）。确定继续？", () => {
          const base = defaultData();
          D = { ...base, ...data, plans: { ...base.plans, ...(data.plans || {}) }, settings: { ...base.settings, ...(data.settings || {}) } };
          if (data.settings && data.settings.moneyCats) MONEY_CATS = data.settings.moneyCats;
          save(); applyTheme(); buildNav(); go(cur);
          toast("数据已导入");
        }, { danger: true });
      } catch (e) { toast("导入失败：文件格式错误"); }
    };
    r.readAsText(f);
  };
  inp.click();
}

/* ----- 习惯模板库 ----- */
const HABIT_TEMPLATES = [
  { name: "晨间例行", icon: "🌅", items: [["喝一杯温水", "💧"], ["拉伸 5 分钟", "🤸"], ["阅读 10 分钟", "📖"], ["记一句今日计划", "📝"]] },
  { name: "健身打卡", icon: "💪", items: [["运动 30 分钟", "🏃"], ["蛋白质加餐", "🥚"], ["23 点前睡", "🌙"]] },
  { name: "阅读习惯", icon: "📚", items: [["阅读 30 分钟", "📖"], ["做读书笔记", "✍️"]] },
  { name: "睡眠优化", icon: "😴", items: [["23 点前放下手机", "📵"], ["冥想 5 分钟", "🧘"]] },
  { name: "专注工作", icon: "🎯", items: [["番茄钟 4 轮", "🍅"], ["清空待办清单", "✅"]] },
];
function openHabitTemplates() {
  openModal(`<h3>🔥 习惯模板库</h3>
    <div class="tool-sub">一键创建一组习惯，开始打卡。</div>
    <div class="grid cols-2">${HABIT_TEMPLATES.map((t, i) => `<div class="card" style="padding:12px;cursor:pointer" onclick="applyHabitTemplate(${i})">
      <div style="font-size:18px">${t.icon} <b>${t.name}</b></div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">${t.items.map((x) => x[0]).join("、")}</div>
    </div>`).join("")}</div>`);
}
function applyHabitTemplate(i) {
  const t = HABIT_TEMPLATES[i]; if (!t) return;
  let n = 0;
  t.items.forEach(([name, icon]) => {
    if (!D.habits.some((h) => h.name === name)) { D.habits.push({ id: uid(), name, icon: icon || "🔥", type: "bool", target: 1, unit: "", history: {} }); n++; }
  });
  save(); closeModal(); renderHabits(); toast("已添加 " + n + " 个习惯");
}

/* ----- 仪表盘拖拽排序 ----- */
let dashDragId = null;
function initDashSort() {
  const sec = $("#sec-dashboard"); if (!sec) return;
  sec.addEventListener("dragstart", (e) => { const c = e.target.closest("[data-dash]"); if (c) { dashDragId = c.dataset.dash; c.style.opacity = ".5"; } });
  sec.addEventListener("dragend", (e) => { const c = e.target.closest("[data-dash]"); if (c) c.style.opacity = ""; });
  sec.addEventListener("dragover", (e) => {
    e.preventDefault();
    const c = e.target.closest("[data-dash]");
    if (c && dashDragId && c.dataset.dash !== dashDragId) {
      const a = [...sec.children].find((n) => n.dataset && n.dataset.dash === dashDragId);
      if (a) sec.insertBefore(a, c);
    }
  });
  sec.addEventListener("drop", (e) => {
    e.preventDefault(); if (!dashDragId) return;
    const order = [...sec.children].filter((n) => n.dataset && n.dataset.dash).map((n) => n.dataset.dash);
    D.settings.dashOrder = order; save(true); dashDragId = null;
  });
}
function applyDashOrder() {
  const order = D.settings.dashOrder; if (!order || !order.length) return;
  const sec = $("#sec-dashboard"); if (!sec) return;
  const map = {}; [...sec.children].forEach((n) => { if (n.dataset && n.dataset.dash) map[n.dataset.dash] = n; });
  order.forEach((id) => { if (map[id]) { sec.appendChild(map[id]); delete map[id]; } });
  Object.values(map).forEach((n) => sec.appendChild(n));
}

/* ----- 保险箱自动锁定 + WebAuthn ----- */
let vaultUnlockedAt = 0;
function initVaultAutoLock() {
  if (vaultUnlocked()) vaultUnlockedAt = Date.now();
  setInterval(() => {
    const mins = +D.settings.vaultAutoLock || 0;
    if (mins > 0 && vaultUnlocked() && vaultUnlockedAt && Date.now() - vaultUnlockedAt > mins * 60000) {
      vaultLock(); toast("🔒 保险箱已因闲置自动锁定");
    }
  }, 30000);
  document.addEventListener("click", () => { if (vaultUnlocked()) vaultUnlockedAt = Date.now(); }, true);
}
function vaultBioAvailable() { return !!(navigator.credentials && window.PublicKeyCredential); }
async function deriveBioKey(rawId) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode("wb_bio_v1"), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new Uint8Array(rawId), iterations: 100000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function vaultRegisterBio() {
  if (!vaultBioAvailable()) return toast("当前浏览器不支持生物识别解锁");
  if (!vaultUnlocked()) return toast("请先解锁保险箱再绑定生物识别");
  const pass = window.__vaultPass; if (!pass) return toast("请重新解锁后再绑定");
  try {
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "生活工作台" },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "vault", displayName: "保险箱" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
    }});
    const wrapKey = await deriveBioKey(cred.rawId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, new TextEncoder().encode(pass));
    D.vault.bioId = _b64enc(new Uint8Array(cred.rawId));
    D.vault.bioWrap = JSON.stringify({ iv: _b64enc(iv), data: _b64enc(new Uint8Array(ct)) });
    save(true); toast("✅ 已绑定生物识别，下次可用指纹解锁");
  } catch (e) { toast("绑定失败：" + (e.message || e)); }
}
async function vaultUnlockBio() {
  if (!D.vault.bioId) return toast("尚未绑定生物识别");
  try {
    const cred = await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: location.hostname, userVerification: "required", timeout: 60000,
    }});
    const wrapKey = await deriveBioKey(_b64dec(D.vault.bioId));
    const env = JSON.parse(D.vault.bioWrap);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: _b64dec(env.iv) }, wrapKey, _b64dec(env.data));
    const pass = new TextDecoder().decode(pt);
    window.__vaultPass = pass;
    await vaultEnsureKey(pass);
    vaultUnlockedAt = Date.now(); renderVaults();
    toast("🔓 生物识别解锁成功");
  } catch (e) { toast("生物识别解锁失败，请用密码"); }
}

/* ----- 统计页相关性 ----- */
function correlationCardHtml() {
  const days = {};
  const add = (d, k, v) => { if (!d) return; days[d] = days[d] || {}; days[d][k] = (days[d][k] || 0) + v; };
  D.study.forEach((x) => add(x.date, "study", +x.minutes || 0));
  D.weights.forEach((x) => add(x.date, "weight", +x.kg));
  D.meals.forEach((x) => add(x.date, "kcal", +x.kcal || 0));
  D.money.filter((x) => x.type === "支出").forEach((x) => add(x.date, "exp", +x.amount));
  const ds = Object.keys(days);
  if (ds.length < 5) return '<div class="empty">记录更多数据后，这里会分析指标间的相关性</div>';
  const keys = ["study", "kcal", "weight", "exp"];
  const series = {}; keys.forEach((k) => series[k] = ds.map((d) => days[d][k] || 0));
  const corr = (a, b) => {
    const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
    return num / (Math.sqrt(da * db) || 1);
  };
  const pairs = [];
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) pairs.push([keys[i], keys[j], corr(series[keys[i]], series[keys[j]])]);
  const labelMap = { study: "学习分钟", kcal: "摄入kcal", weight: "体重kg", exp: "支出¥" };
  return `<div class="card" style="margin-top:16px"><h3>🔗 指标相关性</h3>
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px">基于每日记录的皮尔逊相关系数（越接近 ±1 关联越强）</div>
    ${pairs.map(([a, b, r]) => {
      const pct = Math.round(Math.abs(r) * 100);
      const col = r > 0 ? "var(--green)" : "var(--red)";
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>${labelMap[a]} × ${labelMap[b]}</span><span style="color:${col}">${r >= 0 ? "+" : ""}${r.toFixed(2)}</span></div>
        <div class="pbar"><div style="width:${pct}%;background:${col}"></div></div>
      </div>`;
    }).join("")}
  </div>`;
}

/* ----- 小工具：BMI / 白噪音 / 纪念日 ----- */
function renderBmi() {
  const h = parseFloat(D.settings.height) || "";
  const last = [...D.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const w = last ? last.kg : "";
  const tgt = parseFloat(D.settings.targetWeight) || "";
  return `<div class="tool-body"><h3>⚖️ BMI 计算器</h3>
    <div class="form-row"><input id="bmi-h" type="number" step="0.1" placeholder="身高 cm" value="${h}"><input id="bmi-w" type="number" step="0.1" placeholder="体重 kg" value="${w}"></div>
    <div class="form-row"><input id="bmi-t" type="number" step="0.1" placeholder="目标体重 kg（可选）" value="${tgt}"></div>
    <button class="btn" onclick="calcBmi()">计算 BMI</button>
    <div id="bmi-out" class="tool-result"></div></div>`;
}
function calcBmi() {
  const h = parseFloat($("#bmi-h").value), w = parseFloat($("#bmi-w").value);
  if (!h || !w) return toast("请输入身高体重");
  const bmi = w / ((h / 100) ** 2);
  const cat = bmi < 18.5 ? "偏瘦" : bmi < 24 ? "正常" : bmi < 28 ? "超重" : "肥胖";
  let extra = "";
  const t = parseFloat($("#bmi-t").value);
  if (t && t < w) { const diff = (w - t); extra = `<div style="margin-top:8px;font-size:13px;color:var(--text2)">距目标 ${t}kg 还差 <b style="color:var(--red)">${diff.toFixed(1)}kg</b></div>`; }
  const el = $("#bmi-out"); el.style.display = "block";
  el.innerHTML = `<div class="lot-winner">BMI ${bmi.toFixed(1)} · ${cat}</div>${extra}`;
}
let noiseNode = null, noiseGain = null, noiseCtx = null;
function renderNoise() {
  return `<div class="tool-body"><h3>🔊 专注白噪音</h3>
    <div class="tool-sub">用 Web Audio 实时生成，无需联网、无需音频文件。</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
      <button class="btn sm" onclick="noiseStart('white')">⚪ 白噪音</button>
      <button class="btn sm" onclick="noiseStart('pink')">🌸 粉噪音</button>
      <button class="btn sm" onclick="noiseStart('brown')">🟤 棕噪音</button>
      <button class="btn sm gray" onclick="noiseStop()">⏹ 停止</button>
    </div>
    <div class="form-row"><input id="noise-vol" type="range" min="0" max="100" value="40" oninput="noiseSetVol(this.value)"><span style="flex:none;align-self:center;font-size:12px">音量</span></div>
  </div>`;
}
function noiseStart(type) {
  noiseStop();
  noiseCtx = noiseCtx || new (window.AudioContext || window.webkitAudioContext)();
  const ctx = noiseCtx, bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const out = buffer.getChannelData(0);
  if (type === "white") { for (let i = 0; i < bufferSize; i++) out[i] = Math.random() * 2 - 1; }
  else if (type === "pink") { let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; for (let i = 0; i < bufferSize; i++) { const wn = Math.random() * 2 - 1; b0 = 0.99886 * b0 + wn * 0.0555179; b1 = 0.99332 * b1 + wn * 0.0750759; b2 = 0.969 * b2 + wn * 0.153852; b3 = 0.8665 * b3 + wn * 0.3104856; b4 = 0.55 * b4 + wn * 0.5329522; b5 = -0.7616 * b5 - wn * 0.016898; const p = b0 + b1 + b2 + b3 + b4 + b5 + b6 + wn * 0.5362; b6 = wn * 0.115926; out[i] = p * 0.11; } }
  else { let last = 0; for (let i = 0; i < bufferSize; i++) { const wn = Math.random() * 2 - 1; last = (last + 0.02 * wn) / 1.02; out[i] = last * 3.5; } }
  const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
  const gain = ctx.createGain(); gain.gain.value = (+($("#noise-vol") ? $("#noise-vol").value : 40)) / 100 * 0.5;
  src.connect(gain); gain.connect(ctx.destination); src.start(0);
  noiseNode = src; noiseGain = gain; toast("🔊 播放中");
}
function noiseStop() { if (noiseNode) { try { noiseNode.stop(); } catch (e) {} noiseNode = null; } }
function noiseSetVol(v) { if (noiseGain) noiseGain.gain.value = (+v) / 100 * 0.5; }
function renderAnniversary() {
  const sorted = [...D.countdowns].sort((a, b) => Math.abs(countdownDays(a)) - Math.abs(countdownDays(b)));
  return `<div class="tool-body"><h3>🎂 生日 / 纪念日倒数</h3>
    <div class="tool-sub">记录重要日子，随时查看还有多久。</div>
    <button class="btn sm" onclick="openCountdownModal()">➕ 添加纪念日</button>
    <div style="margin-top:12px">${sorted.length ? sorted.map((c) => {
      const diff = countdownDays(c);
      const txt = c.type === "anniversary" ? (diff <= 0 ? `已 ${-diff} 天` : `还有 ${-diff} 天`) : (diff >= 0 ? `还剩 ${diff} 天` : `已过去 ${-diff} 天`);
      return `<div class="list-item"><span style="font-size:18px">${c.emoji || "🎉"}</span><div class="grow"><div class="title">${esc(c.title)}</div><div class="sub">${c.date}</div></div><span class="tag blue">${txt}</span></div>`;
    }).join("") : '<div class="empty">还没有记录</div>'}</div>
  </div>`;
}

/* ===== 二维码生成（纯 JS，字节模式，EC-L，v1-10） ===== */
const QR_L_DATA = { 1: 19, 2: 34, 3: 55, 4: 80, 5: 108, 6: 136, 7: 156, 8: 194, 9: 232, 10: 274 };
const QR_L_EC = { 1: 7, 2: 10, 3: 15, 4: 20, 5: 26, 6: 18, 7: 20, 8: 24, 9: 30, 10: 36 };
const QR_L_BLOCKS = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2 };
const QR_ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
const QR_GF_EXP = (() => { const e = new Array(256), l = new Array(256); let x = 1; for (let i = 0; i < 255; i++) { e[i] = x; l[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } e[255] = e[0]; l[0] = 0; return { e, l }; })();
function qrGfMul(a, b) { if (!a || !b) return 0; return QR_GF_EXP.e[(QR_GF_EXP.l[a] + QR_GF_EXP.l[b]) % 255]; }
function qrRsGen(ecLen) { let g = [1]; for (let i = 0; i < ecLen; i++) { const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= qrGfMul(g[j], 1); ng[j + 1] ^= qrGfMul(g[j], 2); } g = ng; } return g; }
function qrRsEncode(data, ecLen) { const gen = qrRsGen(ecLen); const res = new Array(ecLen).fill(0); for (const b of data) { const f = b ^ res[0]; res.shift(); res.push(0); if (f) { for (let i = 0; i < res.length; i++) res[i] ^= qrGfMul(gen[i + 1], f); } } return res; }
function qrFormatBits(mask) { const ec = 1; let data = (ec << 3) | mask; let rem = data << 10; const g = 0x537; for (let i = 14; i >= 10; i--) { if ((rem >> i) & 1) rem ^= g << (i - 10); } const bits = ((data << 10) | (rem & 0x3ff)) ^ 0x5412; const out = []; for (let i = 14; i >= 0; i--) out.push((bits >> i) & 1); return out; }
function qrVersionBits(ver) { let d = ver << 12; const g = 0x1f25; for (let i = 17; i >= 12; i--) { if ((d >> i) & 1) d ^= g << (i - 12); } return (ver << 12) | (d & 0xfff); }
function qrMask(mask, r, c) { switch (mask) { case 0: return (r + c) % 2 === 0; case 1: return r % 2 === 0; case 2: return c % 3 === 0; case 3: return (r + c) % 3 === 0; case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; case 5: return ((r * c) % 2) + ((r * c) % 3) === 0; case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0; } return false; }
function qrMaskScore(m, size) {
  let score = 0;
  for (let r = 0; r < size; r++) { let run = 1; for (let c = 1; c < size; c++) { if (m[r][c] === m[r][c - 1]) { run++; if (run === 5) score += 3; else if (run > 5) score++; } else run = 1; } }
  for (let c = 0; c < size; c++) { let run = 1; for (let r = 1; r < size; r++) { if (m[r][c] === m[r - 1][c]) { run++; if (run === 5) score += 3; else if (run > 5) score++; } else run = 1; } }
  for (let r = 0; r < size - 1; r++) for (let c = 0; c < size - 1; c++) { const v = m[r][c]; if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3; }
  const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const chk = (a, b) => { for (let i = 0; i < 11; i++) if (a[b + i] !== pat1[i] && a[b + i] !== pat2[i]) return false; return true; };
  for (let r = 0; r < size; r++) { const row = []; for (let c = 0; c < size; c++) row.push(m[r][c] ? 1 : 0); for (let c = 0; c <= size - 11; c++) if (chk(row, c)) score += 40; }
  for (let c = 0; c < size; c++) { const col = []; for (let r = 0; r < size; r++) col.push(m[r][c] ? 1 : 0); for (let r = 0; r <= size - 11; r++) if (chk(col, r)) score += 40; }
  let dark = 0; for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m[r][c]) dark++;
  const pct = dark / (size * size); const k = Math.floor(Math.abs(pct * 100 - 50) / 5); score += k * 10;
  return score;
}
function qrBuild(text) {
  const bytes = new TextEncoder().encode(text);
  let ver = 0;
  for (let v = 1; v <= 10; v++) { const cc = (v <= 9) ? 8 : 16; const need = 4 + cc + bytes.length * 8; if (QR_L_DATA[v] * 8 >= need) { ver = v; break; } }
  if (!ver) return null;
  const cc = (ver <= 9) ? 8 : 16, capBits = QR_L_DATA[ver] * 8;
  const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  put(4, 4); put(bytes.length, cc);
  for (const b of bytes) put(b, 8);
  for (let i = 0; i < 4 && bits.length < capBits; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) { let x = 0; for (let j = 0; j < 8; j++) x = (x << 1) | bits[i + j]; data.push(x); }
  const pad = [0xEC, 0x11]; let pi = 0; while (data.length < QR_L_DATA[ver]) data.push(pad[(pi++) % 2]);
  const blocks = QR_L_BLOCKS[ver], ecPer = QR_L_EC[ver], total = QR_L_DATA[ver], per = Math.floor(total / blocks);
  const groups = []; for (let i = 0; i < blocks; i++) groups.push(data.slice(i * per, (i + 1) * per));
  const ecGroups = groups.map((g) => qrRsEncode(g, ecPer));
  const finalArr = []; for (let i = 0; i < per; i++) for (const g of groups) if (g[i] !== undefined) finalArr.push(g[i]);
  for (let i = 0; i < ecPer; i++) for (const g of ecGroups) finalArr.push(g[i]);
  const size = 17 + 4 * ver;
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (r, c, val) => { if (r < 0 || c < 0 || r >= size || c >= size) return; m[r][c] = val; fn[r][c] = true; };
  const placeFinder = (r0, c0) => { for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) { const rr = r0 + r, cc = c0 + c; if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue; let v; if (r >= 0 && r <= 6 && c >= 0 && c <= 6) v = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)); else v = null; setFn(rr, cc, v); } };
  placeFinder(0, 0); placeFinder(0, size - 7); placeFinder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) { if (m[6][i] === null) setFn(6, i, (i % 2 === 0)); if (m[i][6] === null) setFn(i, 6, (i % 2 === 0)); }
  const ap = QR_ALIGN[ver];
  for (const r of ap) for (const c of ap) { const onF = (r <= 7 && c <= 7) || (r <= 7 && c >= size - 8) || (r >= size - 8 && c <= 7); if (onF) continue; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) setFn(r + dr, c + dc, (Math.max(Math.abs(dr), Math.abs(dc)) !== 1)); }
  setFn(4 * ver + 9, 8, true);
  const reserveF = (r, c) => { if (m[r][c] === null) { fn[r][c] = true; m[r][c] = false; } };
  for (let i = 0; i <= 8; i++) { if (i !== 6) { reserveF(8, i); reserveF(i, 8); } }
  for (let i = 0; i <= 8; i++) { reserveF(8, size - 1 - i); reserveF(size - 1 - i, 8); }
  if (ver >= 7) { const vb = qrVersionBits(ver); for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const bit = (vb >> (i * 3 + j)) & 1; setFn(size - 11 + j, i, bit); setFn(i, size - 11 + j, bit); } }
  let dir = -1, row = size - 1, col = size - 1, bitPos = 0;
  while (col > 0) { if (col === 6) col--; while (row >= 0 && row < size) { for (let j = 0; j < 2; j++) { const c = col - j; if (m[row][c] === null) { const bit = (bitPos < finalArr.length * 8) ? ((finalArr[bitPos >> 3] >> (7 - (bitPos & 7))) & 1) : 0; m[row][c] = bit; bitPos++; } } row += dir; } dir = -dir; row += dir; col -= 2; }
  let best = null, bestScore = 1e9, bestMask = 0;
  for (let mask = 0; mask < 8; mask++) {
    const mm = m.map((r) => r.slice());
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!fn[r][c]) mm[r][c] = mm[r][c] ? !(qrMask(mask, r, c)) : (qrMask(mask, r, c));
    const sc = qrMaskScore(mm, size);
    if (sc < bestScore) { bestScore = sc; best = mm; bestMask = mask; }
  }
  const fb = qrFormatBits(bestMask);
  const placeFmt = (r, c, bit) => { if (r >= 0 && c >= 0 && r < size && c < size) best[r][c] = bit; };
  for (let i = 0; i <= 5; i++) placeFmt(8, i, fb[i]);
  placeFmt(8, 7, fb[6]); placeFmt(8, 8, fb[7]); placeFmt(7, 8, fb[8]);
  for (let i = 9; i <= 14; i++) placeFmt(14 - i, 8, fb[i]);
  for (let i = 0; i <= 7; i++) placeFmt(8, size - 1 - i, fb[i]);
  placeFmt(8, size - 8, fb[8]);
  for (let i = 8; i <= 14; i++) placeFmt(size - 15 + i, 8, fb[i]);
  return { size, modules: best };
}
function renderQrcode() {
  return `<div class="tool-body"><h3>🔳 二维码生成器</h3>
    <div class="tool-sub">纯本地生成，内容不经过任何服务器。</div>
    <textarea id="qr-text" rows="3" placeholder="输入文字 / 网址 / 任意文本"></textarea>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="btn" onclick="drawQrcode()">生成二维码</button>
      <button class="btn sm ghost" onclick="qrDownload()">⬇ 下载 PNG</button>
    </div>
    <div id="qr-out" class="tool-result"></div></div>`;
}
function drawQrcode() {
  const text = $("#qr-text").value;
  if (!text.trim()) return toast("请输入内容");
  const res = qrBuild(text);
  if (!res) return toast("内容太长（最多约 200 字）");
  const { size, modules } = res;
  const cell = Math.max(2, Math.floor(280 / size));
  let rects = "";
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (modules[r][c]) rects += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}"/>`;
  const dim = size * cell;
  $("#qr-out").style.display = "block";
  $("#qr-out").innerHTML = `<svg id="qr-svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" style="background:#fff;border-radius:8px;max-width:100%"><rect width="${dim}" height="${dim}" fill="#fff"/><g fill="#111">${rects}</g></svg>`;
}
function qrDownload() {
  const svg = $("#qr-svg"); if (!svg) return toast("请先生成二维码");
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => { const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height; const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0); cv.toBlob((b) => downloadFile("qrcode.png", b, "image/png")); };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
}

/* ================= 文件归档（IndexedDB，不占用 localStorage 配额） ================= */
/* 文件以 Blob 形式存 IndexedDB，支持图片/PDF/文档/表格/音视频/压缩包等常见格式；
   元数据随 Blob 一起存储，便于离线检索、预览与下载。 */
const FILE_DB = "wb_files_v1";
let FILES_CACHE = [];           // 会话内缓存，供列表与全局搜索使用
let fileObjUrls = {};           // 图片缩略图 objectURL 缓存，渲染时回收
let fileQuery = "";
let fileCatFilter = "all";

function fileDbOpen() {
  return new Promise((res, rej) => {
    if (!("indexedDB" in window)) { rej(new Error("当前环境不支持 IndexedDB")); return; }
    const r = indexedDB.open(FILE_DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("files")) {
        const os = db.createObjectStore("files", { keyPath: "id" });
        os.createIndex("uploadedAt", "uploadedAt");
        os.createIndex("name", "name");
        os.createIndex("cat", "cat");
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function fileTx(mode) {
  const db = await fileDbOpen();
  return db.transaction("files", mode).objectStore("files");
}
async function fileList() {
  try {
    const os = await fileTx("readonly");
    return await new Promise((res) => {
      const out = [];
      const cur = os.openCursor();
      cur.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { out.push(c.value); c.continue(); }
        else { out.sort((a, b) => b.uploadedAt - a.uploadedAt); FILES_CACHE = out; res(out); }
      };
      cur.onerror = () => res([]);
    });
  } catch (e) { console.error("fileList", e); FILES_CACHE = []; return []; }
}
async function filePut(rec) {
  const os = await fileTx("readwrite");
  return new Promise((res, rej) => { const r = os.put(rec); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
}
async function fileGet(id) {
  try { const os = await fileTx("readonly"); return await new Promise((res) => { const r = os.get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); }
  catch (e) { return null; }
}
async function fileDelete(id) {
  try { const os = await fileTx("readwrite"); await new Promise((res) => { const r = os.delete(id); r.onsuccess = () => res(); r.onerror = () => res(); }); }
  catch (e) {}
}

function fileCat(mime, name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (["doc", "docx", "txt", "md", "markdown", "rtf", "odt"].includes(ext) || m.includes("word") || m === "text/plain" || m.includes("markdown") || m.includes("rtf")) return "doc";
  if (["xls", "xlsx", "csv", "ods"].includes(ext) || m.includes("excel") || m.includes("spreadsheet")) return "sheet";
  if (["ppt", "pptx", "odp", "key"].includes(ext) || m.includes("powerpoint") || m.includes("presentation")) return "slide";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  if (["zip", "rar", "7z", "tar", "gz", "tgz", "bz2"].includes(ext)) return "archive";
  if (["html", "htm", "js", "json", "css", "xml", "py", "java", "c", "cpp", "go", "rs", "ts", "sh", "yaml", "yml", "ini", "env", "sql", "php"].includes(ext) || m.includes("json")) return "code";
  return "other";
}
const FILE_CAT_ICON = { image: "🖼️", pdf: "📕", doc: "📄", sheet: "📊", slide: "📑", audio: "🎵", video: "🎬", archive: "🗜️", code: "💻", other: "📦" };
const FILE_CAT_NAME = { image: "图片", pdf: "PDF", doc: "文档", sheet: "表格", slide: "演示", audio: "音频", video: "视频", archive: "压缩包", code: "代码", other: "其他" };
const FILE_TEXT_OK = ["txt", "md", "markdown", "json", "csv", "log", "js", "ts", "css", "xml", "html", "htm", "yaml", "yml", "py", "java", "c", "cpp", "go", "rs", "sh", "ini", "env", "sql", "php"];
function canTextPreview(f) {
  if ((f.mime || "").startsWith("text/") && f.size < 2 * 1024 * 1024) return true;
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  return FILE_TEXT_OK.includes(ext) && f.size < 2 * 1024 * 1024;
}
function fmtSize(b) {
  if (b == null) return "0 B";
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + " MB";
  return (b / 1024 / 1024 / 1024).toFixed(2) + " GB";
}
function fileCatOptions() {
  const cats = ["all", ...new Set(FILES_CACHE.map((f) => f.cat))];
  return cats.map((c) => `<option value="${c}" ${fileCatFilter === c ? "selected" : ""}>${c === "all" ? "全部类型" : (FILE_CAT_NAME[c] || c)}</option>`).join("");
}

function renderFiles() {
  fileList().then(() => {
    const total = FILES_CACHE.reduce((s, f) => s + f.size, 0);
    $("#sec-files").innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <h3>📂 文件归档</h3>
      <div class="sub" id="files-sub">本地存储（IndexedDB），共 ${FILES_CACHE.length} 个文件 · ${fmtSize(total)}。支持图片/PDF/文档/表格/音视频/压缩包等常见格式，离线可用，不参与云端同步。</div>
      <div id="file-drop" class="file-drop" onclick="document.getElementById('file-input').click()"
           ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="fileDrop(event)">
        ⬆️ 点击或拖拽文件到此处上传（可多选）
        <input id="file-input" type="file" multiple style="display:none" onchange="filePick(this)">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <input id="file-search" placeholder="🔍 搜索文件名 / 标签 / 备注" value="${esc(fileQuery)}" oninput="fileQuery=this.value;refreshFiles()" style="flex:1;min-width:180px">
        <select id="file-cat" onchange="fileCatFilter=this.value;refreshFiles()">${fileCatOptions()}</select>
      </div>
    </div>
    <div id="file-grid-host"></div>`;
    refreshFiles();
  });
}
function refreshFiles() {
  const host = document.getElementById("file-grid-host");
  if (!host) return;
  const q = (fileQuery || "").trim().toLowerCase();
  const filtered = FILES_CACHE.filter((f) => {
    if (fileCatFilter !== "all" && f.cat !== fileCatFilter) return false;
    if (q && !((f.name || "").toLowerCase().includes(q) || (f.tags || "").toLowerCase().includes(q) || (f.note || "").toLowerCase().includes(q))) return false;
    return true;
  });
  Object.keys(fileObjUrls).forEach((id) => { if (!filtered.find((f) => f.id === id)) { URL.revokeObjectURL(fileObjUrls[id]); delete fileObjUrls[id]; } });
  if (!FILES_CACHE.length) { host.innerHTML = `<div class="empty">还没有归档文件。上传后会出现在这里，随时查找、预览或下载。</div>`; return; }
  if (!filtered.length) { host.innerHTML = `<div class="empty">没有匹配「${esc(fileQuery)}」的文件。</div>`; return; }
  host.innerHTML = `<div class="file-grid">` + filtered.map(fileCardHtml).join("") + `</div>`;
}
function fileCardHtml(f) {
  const isImg = f.cat === "image";
  let thumb;
  if (isImg) {
    if (!fileObjUrls[f.id]) fileObjUrls[f.id] = URL.createObjectURL(f.blob);
    thumb = `<img class="file-thumb" src="${fileObjUrls[f.id]}" alt="">`;
  } else {
    thumb = `<div class="file-thumb file-thumb-icon">${FILE_CAT_ICON[f.cat] || "📦"}</div>`;
  }
  const dateStr = f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString("zh-CN") : "";
  const tagline = (f.tags || f.note) ? `<div class="file-tags">${esc(f.tags || "")}${f.note ? (" · " + esc(f.note)) : ""}</div>` : "";
  return `<div class="file-card">
    <div class="file-thumb-wrap" onclick="filePreview('${f.id}')" title="点击查看">${thumb}</div>
    <div class="file-meta">
      <div class="file-name" title="${esc(f.name)}">${esc(f.name)}</div>
      <div class="file-sub">${FILE_CAT_NAME[f.cat] || "文件"} · ${fmtSize(f.size)} · ${dateStr}</div>
      ${tagline}
    </div>
    <div class="file-actions">
      <button class="btn sm" onclick="filePreview('${f.id}')">查看</button>
      <button class="btn sm" onclick="fileDownload('${f.id}')">下载</button>
      <button class="btn sm" onclick="fileEdit('${f.id}')">编辑</button>
      <button class="btn sm danger" onclick="fileRemove('${f.id}')">删除</button>
    </div>
  </div>`;
}
function fileDrop(e) {
  e.preventDefault();
  const dz = document.getElementById("file-drop"); if (dz) dz.classList.remove("over");
  const files = e.dataTransfer && e.dataTransfer.files;
  if (files && files.length) fileAddMany(files);
}
function filePick(input) {
  if (input.files && input.files.length) fileAddMany(input.files);
  input.value = "";
}
async function fileAddMany(fileListObj) {
  const arr = Array.from(fileListObj || []);
  if (!arr.length) return;
  let n = 0;
  for (const file of arr) {
    try {
      await filePut({ id: uid(), name: file.name || ("未命名-" + uid()), size: file.size, mime: file.type || "", cat: fileCat(file.type, file.name), tags: "", note: "", uploadedAt: Date.now(), blob: file });
      n++;
    } catch (e) { console.error("fileAdd", e); }
  }
  await fileList();
  refreshFiles();
  const sub = document.getElementById("files-sub");
  if (sub) sub.textContent = `本地存储（IndexedDB），共 ${FILES_CACHE.length} 个文件 · ${fmtSize(FILES_CACHE.reduce((s, f) => s + f.size, 0))}。支持图片/PDF/文档/表格/音视频/压缩包等常见格式，离线可用，不参与云端同步。`;
  toast(`已归档 ${n} 个文件${arr.length - n ? "（" + (arr.length - n) + " 个失败）" : ""}`);
}
async function filePreview(id) {
  const f = await fileGet(id);
  if (!f) return toast("文件不存在");
  if (f.cat === "image") {
    const url = URL.createObjectURL(f.blob);
    openModal(`<h3>${esc(f.name)}</h3>
      <div style="text-align:center"><img src="${url}" style="max-width:100%;max-height:68vh;border-radius:8px"></div>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" onclick="fileDownload('${id}')">下载</button><button class="btn gray" onclick="closeModal()">关闭</button></div>`);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else if (f.cat === "pdf" || f.mime === "application/pdf") {
    const url = URL.createObjectURL(f.blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else if (canTextPreview(f)) {
    const txt = await f.blob.text().catch(() => "");
    openModal(`<h3>${esc(f.name)}</h3>
      <pre class="file-pre">${esc((txt || "").slice(0, 30000))}</pre>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" onclick="fileDownload('${id}')">下载</button><button class="btn gray" onclick="closeModal()">关闭</button></div>`);
  } else {
    fileDownload(id);
  }
}
async function fileDownload(id) {
  const f = await fileGet(id);
  if (!f) return toast("文件不存在");
  const url = URL.createObjectURL(f.blob);
  const a = document.createElement("a"); a.href = url; a.download = f.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function fileEdit(id) {
  const f = await fileGet(id);
  if (!f) return;
  openModal(`<h3>✏️ 编辑文件信息</h3>
    <div class="form-row"><input id="fe-name" value="${esc(f.name)}" placeholder="文件名"></div>
    <div class="form-row"><input id="fe-tags" value="${esc(f.tags || "")}" placeholder="标签（逗号分隔，便于检索）"></div>
    <div class="form-row"><input id="fe-note" value="${esc(f.note || "")}" placeholder="备注"></div>
    <div style="display:flex;gap:8px"><button class="btn" onclick="fileSaveEdit('${id}')">保存</button><button class="btn gray" onclick="closeModal()">取消</button></div>`);
}
async function fileSaveEdit(id) {
  const f = await fileGet(id);
  if (!f) return;
  f.name = ($("#fe-name").value || "").trim() || f.name;
  f.tags = ($("#fe-tags").value || "").trim();
  f.note = ($("#fe-note").value || "").trim();
  await filePut(f); await fileList(); refreshFiles(); closeModal(); toast("已保存");
}
function fileRemove(id) {
  appConfirm("确定删除该归档文件？此操作不可恢复。", async () => {
    await fileDelete(id);
    if (fileObjUrls[id]) { URL.revokeObjectURL(fileObjUrls[id]); delete fileObjUrls[id]; }
    await fileList(); refreshFiles();
    const sub = document.getElementById("files-sub");
    if (sub) sub.textContent = `本地存储（IndexedDB），共 ${FILES_CACHE.length} 个文件 · ${fmtSize(FILES_CACHE.reduce((s, f) => s + f.size, 0))}。支持图片/PDF/文档/表格/音视频/压缩包等常见格式，离线可用，不参与云端同步。`;
    toast("已删除");
  }, { danger: true, yesText: "删除" });
}

(function init() {
  const d = new Date();
  $("#page-date").textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK[d.getDay()]}`;
  applyTheme();
  initThemeMode();
  processRecurringBills();
  initVaultAutoLock();
  initDashSort();
  buildNav();
  fileList().catch(() => {});  // 预热文件缓存，供全局搜索使用
  updateSyncChip();
  checkBackupReminder();
  if (__corruptRaw) showCorruptBanner(__corruptRaw);
  const dl = $("#dl-btn");
  if (dl) dl.textContent = isMobile() ? "📲 下载" : "💻 下载";
  registerSW();
  checkUpdate();
  initReminders();
  initShortcuts();
  go("dashboard");
  setInterval(() => { if (D.settings.syncCode) updateSyncChip(); }, 30000);
  window.addEventListener("beforeunload", saveFlush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveFlush();
      // 切到后台即把最新改动推上去，避免快速关页丢失（异步尽力，正常保存早已在防抖推送）
      if (D.settings.autoSync && D.settings.syncCode) syncPushSilent().catch(() => {});
    } else foregroundPull();   // 从后台切回：补拉另一端的改动
  });
  window.addEventListener("focus", foregroundPull);
  setInterval(() => { if (document.visibilityState === "visible") foregroundPull(); }, 45000); // 前台每 45 秒兜底拉取，多端改动约 1 分钟内自动出现
  // 自动同步：开启后打开即拉取云端最新并与本地合并（保存时的自动推送已在 save() 内）
  if (D.settings.autoSync && D.settings.syncCode) syncPullSilent().catch(() => {});
  if (D.settings.syncBackend === "supabase" && D.settings.supabaseUrl && D.settings.supabaseAnon) initSupabaseRealtime();
  maybeShowSyncSetup();   // 首次无同步码：弹出两步引导，像 App 一样一键开通
  // 点击其他地方关闭食材联想
  document.addEventListener("click", (e) => {
    const box = $("#food-suggest");
    if (box && !e.target.closest("#food-name") && !e.target.closest("#food-suggest")) box.style.display = "none";
  });
})();

/* ================= 新增 · 改进功能（v1.10） ================= */
/* 记账：近 6 个月预算执行率趋势 */
function budgetExecTrendHtml() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.getFullYear() + "-" + pad(d.getMonth() + 1);
    let exp = D.money.filter((x) => x.date.startsWith(key) && x.type === "支出" && moneyCounted(x)).reduce((a, x) => a + x.amount, 0);
    if (moneyView === "amort") { const a = amortAdjust(key); exp = Math.max(0, exp - a.removed + a.added); }
    const bud = D.moneyBudgets[key] || 0;
    months.push({ key, exp, bud, pct: bud ? Math.round(exp / bud * 100) : null });
  }
  if (!months.some((m) => m.bud)) return "";
  const max = Math.max.apply(null, months.map((m) => Math.max(m.exp, m.bud)).concat([1]));
  const W = 320, H = 150, bw = 26;
  const gap = (W - 24 - months.length * bw) / Math.max(1, months.length - 1);
  const bars = months.map((m, i) => {
    const x = 16 + i * (bw + gap);
    const eh = (m.exp / max) * (H - 40);
    const bh = m.bud ? (m.bud / max) * (H - 40) : 0;
    const over = m.bud && m.exp > m.bud;
    return '<g><rect x="' + x + '" y="' + (H - 24 - eh) + '" width="' + bw + '" height="' + Math.max(eh, 1) + '" rx="3" fill="' + (over ? "var(--red)" : "var(--primary)") + '"><title>' + m.key + ' 支出 ' + fmtMoney(m.exp) + '</title></rect>' +
      (m.bud ? '<rect x="' + x + '" y="' + (H - 24 - bh) + '" width="' + bw + '" height="3" fill="var(--text2)"><title>' + m.key + ' 预算 ' + fmtMoney(m.bud) + '</title></rect>' : '') +
      '<text x="' + (x + bw / 2) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="9" fill="var(--text2)">' + m.key.slice(2) + '月</text>' +
      (m.pct != null ? '<text x="' + (x + bw / 2) + '" y="' + (H - 28 - eh) + '" text-anchor="middle" font-size="9" fill="' + (over ? "var(--red)" : "var(--text2)") + '">' + m.pct + '%</text>' : '') + '</g>';
  }).join("");
  return '<div class="card" style="margin-bottom:16px"><h3>📉 近 6 个月预算执行率 <span class="more">柱=支出 横线=预算' + (moneyView === "amort" ? " · 摊销口径" : "") + '</span></h3><div class="chart-wrap"><svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="min-width:300px">' + bars + '</svg></div></div>';
}
/* 饮食：近 30 天营养趋势（热量 vs 目标） */
function dietTrend30Html() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const ms = D.meals.filter((x) => x.date === ds);
    days.push({ ds, kcal: ms.reduce((a, b) => a + b.kcal, 0), p: ms.reduce((a, b) => a + b.p, 0), c: ms.reduce((a, b) => a + b.c, 0), f: ms.reduce((a, b) => a + b.f, 0) });
  }
  const s = D.settings;
  const max = Math.max.apply(null, days.map((d) => d.kcal).concat([s.kcalTarget, 1]));
  const W = 320, H = 150;
  const line = days.map((d, i) => { const x = 16 + i * ((W - 24) / 29); const y = 120 - (d.kcal / max) * 100; return (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1); }).join(" ");
  const ty = 120 - (s.kcalTarget / max) * 100;
  const recDays = days.filter((d) => d.kcal);
  const onTarget = days.filter((d) => d.kcal && Math.abs(d.kcal - s.kcalTarget) / s.kcalTarget < 0.15).length;
  const avg = (k) => Math.round(recDays.reduce((a, b) => a + b[k], 0) / Math.max(1, recDays.length));
  return '<div class="chart-wrap"><svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="min-width:300px">' +
    '<line x1="15" y1="' + ty + '" x2="' + (W - 5) + '" y2="' + ty + '" stroke="#e11d48" stroke-width="1" stroke-dasharray="4 3"/>' +
    '<text x="' + (W - 6) + '" y="' + (ty - 4) + '" text-anchor="end" font-size="9" fill="#e11d48">目标 ' + s.kcalTarget + '</text>' +
    '<path d="' + line + '" fill="none" stroke="var(--orange)" stroke-width="2" stroke-linejoin="round"/></svg></div>' +
    '<div style="font-size:12px;color:var(--text2);margin-top:6px">近30天有 <b>' + recDays.length + '</b> 天记录了饮食；其中 <b style="color:var(--green)">' + onTarget + ' 天</b>热量接近目标（±15%）。日均 蛋白/碳水/脂肪：' + avg("p") + " / " + avg("c") + " / " + avg("f") + " g（目标 " + s.pTarget + "/" + s.cTarget + "/" + s.fTarget + "）</div>";
}
/* AI 复盘：本周数据速览（本地汇总，不调 AI） */
function weekSummaryHtml() {
  const t = todayStr();
  const from = addDaysStr(t, -6);
  const inR = (d) => d >= from && d <= t;
  const meals = D.meals.filter((m) => inR(m.date));
  const mealDays = new Set(meals.map((m) => m.date)).size;
  const kcal = sum(meals, (m) => m.kcal);
  const studyMin = sum(D.study.filter((x) => inR(x.date)), (x) => x.minutes || 0);
  const createdInR = (x) => inR(toDateStr(x.created || Date.now()));
  const todoTotal = D.todos.filter(createdInR).length;
  const todoDone = D.todos.filter((x) => x.done && createdInR(x)).length;
  const habits = (D.habits || []).reduce((a, h) => a + Object.keys(h.history || {}).filter(inR).length, 0);
  const exp = sum(D.money.filter((x) => inR(x.date) && x.type === "支出"), (x) => x.amount);
  const items = [
    ["🍽 饮食记录", mealDays + " 天 / 7", mealDays >= 5 ? "var(--green)" : "var(--orange)"],
    ["🔥 日均热量", Math.round(kcal / Math.max(1, mealDays)) + " kcal", "var(--text)"],
    ["📚 学习打卡", studyMin + " 分钟", "var(--teal)"],
    ["✅ 待办完成", todoTotal ? Math.round(todoDone / todoTotal * 100) + "%" : "—", "var(--primary)"],
    ["🔥 习惯打卡", habits + " 次", "var(--green)"],
    ["💰 本周支出", fmtMoney(exp), "var(--red)"],
  ];
  return `<div class="card" style="margin-bottom:16px"><h3>📊 本周数据速览 <span class="more" onclick="reviewKind='7d';renderReview();setTimeout(runReview,60)">🤖 生成本周复盘 ›</span></h3>
    <div class="grid cols-3" style="gap:10px">${items.map((v) => `<div style="text-align:center"><div style="font-size:18px;font-weight:700;color:${v[2]}">${v[1]}</div><div style="font-size:12px;color:var(--text2)">${v[0]}</div></div>`).join("")}</div></div>`;
}
/* 习惯：整体打卡热力图（聚合所有习惯，近 120 天，GitHub 风格） */
function allHabitsHeatHtml() {
  const habits = D.habits || [];
  if (!habits.length) return "";
  const days = 119;
  let cells = "";
  for (let i = days; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    let cnt = 0; habits.forEach((h) => { if (h.history && h.history[ds]) cnt++; });
    const lvl = habits.length ? Math.min(4, Math.ceil(cnt / habits.length * 4)) : 0;
    cells += `<div class="heat-cell l${lvl}" title="${ds} · ${cnt}/${habits.length} 个习惯打卡"></div>`;
  }
  return `<div class="card" style="margin-bottom:16px"><h3>🔥 整体打卡热力图 <span class="more">${habits.length} 个习惯 · 近 120 天</span></h3>
    <div class="heat-grid">${cells}</div>
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2);margin-top:8px">少 <span class="heat-cell l0"></span><span class="heat-cell l1"></span><span class="heat-cell l2"></span><span class="heat-cell l3"></span><span class="heat-cell l4"></span> 多</div></div>`;
}
/* 命令面板（Ctrl/Cmd + K） */
function openCommandPalette() {
  let box = $("#cmd-palette");
  if (!box) {
    box = document.createElement("div");
    box.id = "cmd-palette";
    box.className = "cmd-palette";
    box.innerHTML = `<div class="cmd-bg" onclick="closeCommandPalette()"></div>
      <div class="cmd-box">
        <input id="cmd-input" class="cmd-input" placeholder="🔍 输入命令或搜索，如：待办 / 记账 / 设置 / 导出…" oninput="cmdFilter()" onkeydown="cmdKey(event)">
        <div id="cmd-list" class="cmd-list"></div>
        <div class="cmd-foot">↑↓ 选择 · Enter 执行 · Esc 关闭 · 直接输入文字可全局搜索</div>
      </div>`;
    document.body.appendChild(box);
  }
  box.style.display = "flex";
  cmdFilter();
  setTimeout(() => { const i = $("#cmd-input"); if (i) i.focus(); }, 30);
}
function closeCommandPalette() { const b = $("#cmd-palette"); if (b) b.style.display = "none"; }
function cmdCommands() {
  const cmds = PAGES.map((p) => ({ t: "前往 · " + p.name, ico: p.ico, act: () => { closeCommandPalette(); go(p.id); } }));
  cmds.push({ t: "➕ 快速添加待办", ico: "✅", act: () => { closeCommandPalette(); openQuickAdd("todo"); } });
  cmds.push({ t: "➕ 记一笔账", ico: "💰", act: () => { closeCommandPalette(); openQuickAdd("money"); } });
  cmds.push({ t: "➕ 学习打卡", ico: "📚", act: () => { closeCommandPalette(); openQuickAdd("study"); } });
  cmds.push({ t: "📤 导出备份", ico: "📦", act: () => { closeCommandPalette(); exportData(); } });
  cmds.push({ t: "🤖 生成本周复盘", ico: "🧠", act: () => { closeCommandPalette(); go("review"); reviewKind = "7d"; setTimeout(runReview, 60); } });
  cmds.push({ t: "🌐 全局搜索", ico: "🔍", act: () => { closeCommandPalette(); openSearch(); } });
  return cmds;
}
function cmdFilter() {
  const q = ($("#cmd-input").value || "").trim().toLowerCase();
  const list = $("#cmd-list"); if (!list) return;
  let cmds = cmdCommands().filter((c) => c.t.toLowerCase().includes(q));
  if (q.length >= 1) cmds = [{ t: "🔍 搜索：「" + q + "」", ico: "🔎", act: () => { closeCommandPalette(); const g = $("#gs-input"); if (g) { g.value = q; doSearch(); } } }].concat(cmds);
  if (!cmds.length) { list.innerHTML = '<div class="cmd-empty">无匹配命令</div>'; window.__cmdList = []; return; }
  list.innerHTML = cmds.map((c, i) => `<div class="cmd-item ${i === 0 ? "active" : ""}" data-i="${i}" onmouseenter="cmdHover(${i})" onclick="cmdRun(${i})"><span class="cmd-ico">${c.ico}</span><span>${esc(c.t)}</span></div>`).join("");
  window.__cmdList = cmds; window.__cmdSel = 0;
}
function cmdHover(i) { window.__cmdSel = i; document.querySelectorAll(".cmd-item").forEach((el, idx) => el.classList.toggle("active", idx === i)); }
function cmdKey(e) {
  const list = window.__cmdList || [];
  if (e.key === "ArrowDown") { e.preventDefault(); window.__cmdSel = Math.min(list.length - 1, (window.__cmdSel || 0) + 1); cmdHover(window.__cmdSel); }
  else if (e.key === "ArrowUp") { e.preventDefault(); window.__cmdSel = Math.max(0, (window.__cmdSel || 0) - 1); cmdHover(window.__cmdSel); }
  else if (e.key === "Enter") { e.preventDefault(); cmdRun(window.__cmdSel || 0); }
  else if (e.key === "Escape") { e.preventDefault(); closeCommandPalette(); }
}
function cmdRun(i) { const c = (window.__cmdList || [])[i]; if (c) c.act(); }