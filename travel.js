/* ===================== 旅行计划模块 ===================== */
"use strict";

/* ---------- 状态 ---------- */
let travelView = "home";      // home | detail
let curTripId = null;
let planLoading = false;
let spotLoadingId = null;

const TRIP_MONEY_CATS = ["门票", "交通", "餐饮", "住宿", "购物", "娱乐", "其他"];
const TL_ICONS = { arrive: "🛬", depart: "🛫", checkin: "🏨", spot: "🏞️", transit: "🚏", meal: "🍜", free: "☕" };

/* ---------- 定位 / 地图 / 附近推荐 状态 ---------- */
let userLoc = null;          // {lat,lng,acc,ts}
let nearbyRes = null;        // {list, far, kw, cat, radius} | {notice:'needKey'} | {error}
let nearbyLoading = false;
let nearbyCtg = "food";      // food | spot | kw
let nearbyKw = "";           // “我想吃”自定义关键词
let nearbyRadius = 2000;     // 搜索半径(米)
let nearbyWalkOnly = false;  // 只显示步行可达(<1km)
const mapInstances = {};     // 容器id -> TMap 实例
const geoCache = {};         // 城市|名称 -> {lat,lng}


/* ---------- 工具 ---------- */
function tripById(id) { return (D.trips || []).find((t) => t.id === id); }
function tripDates(t) {
  const out = [];
  if (!t.startDate || !t.endDate) return out;
  let d = new Date(t.startDate + "T00:00:00");
  const end = new Date(t.endDate + "T00:00:00");
  while (d <= end && out.length < 30) {
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    d = new Date(d.getTime() + 86400000);
  }
  return out;
}
function tripStatusTag(t) {
  if (t.status === "archived") return '<span class="tag purple">已归档</span>';
  const today = todayStr();
  if (today < t.startDate) return '<span class="tag blue">规划中</span>';
  if (today > t.endDate) return '<span class="tag orange">待归档</span>';
  return '<span class="tag lo">进行中</span>';
}
function tripMoneyList(t) { return D.money.filter((x) => x.tripId === t.id); }
function tripSpend(t) { return tripMoneyList(t).filter((x) => x.type === "支出").reduce((a, b) => a + b.amount, 0); }

/* AI 通用调用 */
function travelAiReady() { return typeof aiReady === "function" ? aiReady() : !!(D.settings.aiBase && D.settings.aiKey && D.settings.aiModel); }
async function travelAiChat(prompt) { return aiChat(prompt, { temperature: 0.4 }); }
function pickJson(txt) {
  const t = txt.replace(/```json|```/g, "");
  const m = t.match(/[\[{][\s\S]*[\]}]/);
  if (!m) throw new Error("AI 未返回有效 JSON");
  return JSON.parse(m[0]);
}

/* ---------- 主渲染 ---------- */
function renderTravel() {
  if (travelView === "detail" && tripById(curTripId)) renderTripDetail();
  else { travelView = "home"; renderTravelHome(); }
}

/* ========== 旅行首页 ========== */
function renderTravelHome() {
  const trips = [...(D.trips || [])].sort((a, b) => {
    if ((a.status === "archived") !== (b.status === "archived")) return a.status === "archived" ? 1 : -1;
    return (b.startDate || "").localeCompare(a.startDate || "");
  });
  const habits = D.travelHabits || [];
  $("#sec-travel").innerHTML = `
  <div class="card" style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
    <div>
      <div style="font-weight:700;font-size:15px">✈️ 我的旅行</div>
      <div style="font-size:12px;color:var(--text2);margin-top:3px">选城市 → 挑景点 → 智能规划路径与住宿 → 边玩边记账 → 归档沉淀经验</div>
    </div>
    <button class="btn" onclick="openTripWizard()">+ 新建旅行</button>
    <button class="btn ghost" onclick="locateMe()">📍 定位当前位置</button>
    <button class="btn ghost" onclick="showSetupGuide('map')">🗺️ 地图指引</button>
  </div>
  <div class="grid cols-2">
    <div class="card">
      <h3>🗺️ 旅行列表</h3>
      ${trips.length ? trips.map((t) => tripCardHtml(t)).join("") : '<div class="empty">还没有旅行计划，点右上角「新建旅行」开始吧</div>'}
    </div>
    <div class="card">
      <h3>🧭 个人旅行习惯 <span class="more">归档旅行后自动沉淀，AI 规划时自动参考</span></h3>
      <div class="form-row">
        <input id="th-text" placeholder="手动补充习惯，如：不爱早起，上午行程别排太满">
        <button class="btn sm" onclick="addTravelHabit()">添加</button>
      </div>
      ${habits.length ? habits.map((h) => `<div class="list-item">
        <span style="font-size:16px">💡</span>
        <div class="grow"><div class="title" style="font-size:13px">${esc(h.text)}</div><div class="sub">${esc(h.from || "手动添加")} · ${h.date || ""}</div></div>
        <button class="icon-btn" onclick="delTravelHabit('${h.id}')">✕</button></div>`).join("") : '<div class="empty">暂无沉淀的旅行习惯</div>'}
    </div>
  </div>`;
}
function tripCardHtml(t) {
  const spend = tripSpend(t);
  const days = tripDates(t).length;
  return `<div class="list-item" style="cursor:pointer" onclick="openTrip('${t.id}')">
    <span style="font-size:22px">${t.status === "archived" ? "📦" : "🧳"}</span>
    <div class="grow">
      <div class="title"><b>${esc(t.name || t.city)}</b> · ${esc(t.city)}</div>
      <div class="sub">${t.startDate} ~ ${t.endDate}（${days}天）· 景点 ${t.spots.length} 个 · 已花 ${fmtMoney(spend)}${t.status !== "archived" && t.startDate >= todayStr() ? ` · ✈️ 距出发 ${Math.round((new Date(t.startDate + "T00:00:00") - new Date(todayStr() + "T00:00:00")) / 86400000)} 天` : ""}</div>
    </div>
    ${tripStatusTag(t)}
    <span style="color:var(--text2)">›</span>
  </div>`;
}

/* ========== 新建 / 编辑旅行 ========== */
function openTripWizard(id) {
  const t = id ? tripById(id) : null;
  const hotelsTxt = t ? (t.hotels || []).map((h) => [h.name, h.addr, h.from, h.to].filter(Boolean).join(" | ")).join("\n") : "";
  openModal(`<h3>${t ? "✏️ 编辑旅行" : "🧳 新建旅行"}</h3>
    <div class="form-row">
      <div style="flex:1"><label class="fl">旅行名称</label><input id="tw-name" placeholder="如：暑假成都行" value="${t ? esc(t.name) : ""}"></div>
      <div style="flex:1"><label class="fl">目的地城市</label><input id="tw-city" placeholder="如：成都" value="${t ? esc(t.city) : ""}"></div>
    </div>
    <div class="form-row">
      <div style="flex:1"><label class="fl">开始日期</label><input id="tw-start" type="date" value="${t ? t.startDate : todayStr()}"></div>
      <div style="flex:1"><label class="fl">结束日期</label><input id="tw-end" type="date" value="${t ? t.endDate : todayStr()}"></div>
    </div>
    <div class="form-row">
      <div style="flex:1"><label class="fl">到达车站/机场</label><input id="tw-arrive" placeholder="如：成都东站 / 双流机场T2" value="${t ? esc(t.arriveVia) : ""}"></div>
      <div style="flex:0 0 110px"><label class="fl">到达时间</label><input id="tw-arrivetime" type="time" value="${t ? t.arriveTime : "12:00"}"></div>
    </div>
    <div class="form-row">
      <div style="flex:1"><label class="fl">离开车站/机场</label><input id="tw-depart" placeholder="如：成都东站" value="${t ? esc(t.departVia) : ""}"></div>
      <div style="flex:0 0 110px"><label class="fl">出发时间</label><input id="tw-departtime" type="time" value="${t ? t.departTime : "18:00"}"></div>
    </div>
    <div class="form-row">
      <div style="flex:1"><label class="fl">酒店情况</label>
        <select id="tw-hotelmode" onchange="$('#tw-hotels-box').style.display=this.value==='booked'?'block':'none'">
          <option value="auto" ${t && t.hotelMode === "auto" ? "selected" : ""}>还没订酒店（让 AI 根据景点智能推荐最优住宿区）</option>
          <option value="booked" ${t && t.hotelMode === "booked" ? "selected" : ""}>已订好酒店（作为每日出发点和终点）</option>
        </select>
      </div>
    </div>
    <div id="tw-hotels-box" style="display:${t && t.hotelMode === "booked" ? "block" : "none"}">
      <label class="fl">已订酒店（每行一个：酒店名 | 地址 | 入住日期 | 退房日期，多天可换酒店）</label>
      <textarea id="tw-hotels" rows="3" placeholder="如意酒店 | 春熙路 | 2026-08-01 | 2026-08-03&#10;熊猫民宿 | 宽窄巷子 | 2026-08-03 | 2026-08-05">${esc(hotelsTxt)}</textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn" onclick="saveTripWizard('${t ? t.id : ""}')">保存</button>
      <button class="btn gray" onclick="closeModal()">取消</button>
    </div>`);
}
function saveTripWizard(id) {
  const city = $("#tw-city").value.trim();
  const start = $("#tw-start").value, end = $("#tw-end").value;
  if (!city) return toast("请填写目的地城市");
  if (!start || !end || end < start) return toast("请检查旅行日期");
  const hotels = $("#tw-hotels").value.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const p = l.split("|").map((x) => x.trim());
    return { name: p[0] || "", addr: p[1] || "", from: p[2] || "", to: p[3] || "" };
  });
  const base = {
    name: $("#tw-name").value.trim() || city + "之行",
    city, startDate: start, endDate: end,
    arriveVia: $("#tw-arrive").value.trim(), arriveTime: $("#tw-arrivetime").value,
    departVia: $("#tw-depart").value.trim(), departTime: $("#tw-departtime").value,
    hotelMode: $("#tw-hotelmode").value, hotels,
  };
  if (id && tripById(id)) {
    Object.assign(tripById(id), base);
    toast("已更新旅行信息，可重新生成规划");
  } else {
    const nt = { id: uid(), ...base, spots: [], plan: null, status: "active", archive: null, created: Date.now() };
    D.trips.push(nt);
    curTripId = nt.id; travelView = "detail";
    // 与倒数日打通：自动建一个出发倒计时
    if (!D.countdowns.some((c) => c.tripId === nt.id)) {
      D.countdowns.push({ id: uid(), title: (base.name || city) + " · 出发", date: start, type: "countdown", emoji: "✈️", tripId: nt.id });
    }
    toast("旅行已创建，去添加想去的景点吧");
  }
  save(); closeModal(); renderTravel();
}
function openTrip(id) { curTripId = id; travelView = "detail"; renderTravel(); }
function backTravelHome() { travelView = "home"; renderTravel(); }
function delTrip(id) {
  openModal(`<h3>⚠️ 删除这次旅行？</h3>
    <div style="font-size:13px;color:var(--text2);margin-bottom:14px">旅行计划将被删除；关联的旅行账单会保留在记账中。建议旅行结束用「归档」代替删除。</div>
    <div style="display:flex;gap:8px">
      <button class="btn danger" onclick="tombstone('${id}');D.countdowns.filter(c=>c.tripId==='${id}').forEach(c=>tombstone(c.id));D.trips=D.trips.filter(t=>t.id!=='${id}');D.countdowns=D.countdowns.filter(c=>c.tripId!=='${id}');save();closeModal();backTravelHome();toast('已删除')">确认删除</button>
      <button class="btn gray" onclick="closeModal()">取消</button>
    </div>`);
}

/* ========== 旅行详情 ========== */
function renderTripDetail() {
  const t = tripById(curTripId);
  if (!t) return renderTravelHome();
  if (!userLoc && D.settings.lastLoc) userLoc = D.settings.lastLoc;
  const archived = t.status === "archived";
  const spend = tripSpend(t);
  const days = tripDates(t).length;
  const list = tripMoneyList(t).sort((a, b) => b.date.localeCompare(a.date));
  const byCat = {};
  list.filter((x) => x.type === "支出").forEach((x) => byCat[x.cat] = (byCat[x.cat] || 0) + x.amount);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  $("#sec-travel").innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <button class="btn sm gray" onclick="backTravelHome()">‹ 返回</button>
      <div style="flex:1;min-width:150px">
        <div style="font-weight:700;font-size:16px">${esc(t.name)} ${tripStatusTag(t)}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:3px">
          📍${esc(t.city)} · ${t.startDate} ~ ${t.endDate}（${days}天）
          ${t.arriveVia ? ` · 🛬 ${esc(t.arriveVia)} ${t.arriveTime}` : ""}
          ${t.departVia ? ` · 🛫 ${esc(t.departVia)} ${t.departTime}` : ""}
        </div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">
          🏨 ${t.hotelMode === "booked" ? (t.hotels.length ? t.hotels.map((h) => esc(h.name)).join("、") : "已订酒店") : "未订酒店 · AI 智能推荐住宿区"}
        </div>
      </div>
      <button class="btn sm ghost" onclick="exportTripView('${t.id}')">🖨 导出</button>
      ${archived ? "" : `<button class="btn sm ghost" onclick="openTripWizard('${t.id}')">编辑</button>
      <button class="btn sm" style="background:var(--teal)" onclick="openArchiveModal('${t.id}')">📦 归档</button>`}
      <button class="btn sm danger" onclick="delTrip('${t.id}')">删除</button>
    </div>
  </div>

  ${archived ? "" : `<div class="card" style="margin-bottom:16px">
    <h3>🌤️ 行程天气 <button class="more" onclick="loadTripWeather(true)">↻ 刷新</button></h3>
    <div id="trip-weather">${t.weather && t.weather.days ? tripWeatherHtml(t) : '<div class="empty">加载中…（免费天气服务，无需配置）</div>'}</div>
  </div>`}

  ${archived && t.archive ? `<div class="card" style="margin-bottom:16px;border-color:var(--purple)">
    <h3>📦 归档回顾</h3>
    <div style="font-size:13px;color:var(--text2);margin-bottom:6px">归档于 ${t.archive.date} · 实际总花费 ${fmtMoney(t.archive.actualCost)}</div>
    <div style="font-size:13px;line-height:1.8;white-space:pre-wrap">${esc(t.archive.experience || "（未填写经验）")}</div>
  </div>` : ""}

  <div class="grid cols-2" style="margin-bottom:16px">
    <div class="card">
      <h3>🏞️ 想去的景点（${t.spots.length}）
        ${archived ? "" : `<button class="btn sm ghost" onclick="aiCityPicks()">🤖 AI 必吃必玩</button>
        <button class="btn sm ghost" onclick="showSetupGuide('ai')">📖 AI 指引</button>
        <button class="btn sm ghost" onclick="fetchAllSpotInfo()">🤖 一键获取全部攻略</button>`}
      </h3>
      ${archived ? "" : `<div class="form-row">
        <input id="sp-name" placeholder="输入景点名，如：宽窄巷子" onkeydown="if(event.key==='Enter')addSpot()">
        <button class="btn sm" onclick="addSpot()">+ 添加</button>
      </div>`}
      ${t.spots.length ? t.spots.map((s) => spotItemHtml(t, s, archived)).join("") : '<div class="empty">先把想去的景点加进来</div>'}
    </div>

    <div class="card">
      <h3>💰 旅行记账（已花 ${fmtMoney(spend)}）</h3>
      ${archived ? "" : `
      <div class="form-row">
        <select id="tm-cat">${TRIP_MONEY_CATS.map((c) => `<option>${c}</option>`).join("")}</select>
        <input id="tm-amount" type="number" placeholder="金额" min="0" step="0.01">
        <input id="tm-date" type="date" value="${todayStr()}">
      </div>
      <div class="form-row">
        <input id="tm-note" placeholder="备注，如：大熊猫基地门票">
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text2);flex:none">
          <input type="checkbox" id="tm-intotal" checked style="width:16px;height:16px"> 计入总账
        </label>
        <button class="btn sm" onclick="addTripMoney()">记一笔</button>
      </div>`}
      ${cats.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${cats.map(([c, v]) => `<span class="chip">${c} ${fmtMoney(v)}</span>`).join("")}</div>` : ""}
      <div style="max-height:300px;overflow-y:auto">
      ${list.length ? list.map((x) => `<div class="list-item">
        <span class="tag ${x.type === "支出" ? "hi" : "lo"}">${x.cat}</span>
        <div class="grow"><div class="title" style="font-size:13px">${esc(x.note) || x.cat}</div><div class="sub">${x.date}${x.inTotal === false ? ' · <span style="color:var(--orange)">未计入总账</span>' : " · 已计入总账"}</div></div>
        <b style="color:${x.type === "支出" ? "var(--red)" : "var(--green)"};font-size:13px">${x.type === "支出" ? "-" : "+"}${fmtMoney(x.amount)}</b>
        ${archived ? "" : `<button class="icon-btn" title="切换是否计入总账" onclick="toggleTripMoneyTotal('${x.id}')">⇄</button>
        <button class="icon-btn" onclick="delTripMoney('${x.id}')">✕</button>`}
      </div>`).join("") : '<div class="empty">还没有旅行账单</div>'}
      </div>
    </div>
  </div>

  ${nearbyCardHtml(t)}

  <div class="card">
    <h3>🗺️ 路线总览 <button class="more" onclick="openRouteModal('${t.id}')">放大 ›</button><button class="more" onclick="showSetupGuide('map')">🗺️ 配置指引</button></h3>
    ${routeHtml(t)}
  </div>

  <div class="card">
    <h3>🧠 智能行程规划
      ${archived ? "" : `<span>
        <button class="btn sm ghost" onclick="openPlanModal()">${t.plan ? "🔄 重新规划" : "⚡ 生成规划"}</button>
      </span>`}
    </h3>
    ${planLoading ? '<div class="empty">🤖 AI 正在规划最优路径，通常需要 20~60 秒，请勿离开本页…</div>'
      : t.plan ? planHtml(t)
      : `<div class="empty">添加景点后点「生成规划」——自动排序景点、规划每段出行方式/费用/耗时${t.hotelMode === "auto" ? "，并推荐每天最优住宿区" : "，以你的酒店为每日起终点"}</div>`}
  </div>`;
  if (!archived) renderRouteMap(t);
  if (!archived && (!t.weather || t.weather.fetched !== todayStr())) loadTripWeather();
}

/* ---------- 天气（Open-Meteo 免费接口，无需 Key） ---------- */
const WMO_MAP = { 0: "☀️ 晴", 1: "🌤 多云转晴", 2: "⛅ 多云", 3: "☁️ 阴", 45: "🌫 雾", 48: "🌫 雾凇", 51: "🌦 毛毛雨", 53: "🌦 小雨", 55: "🌧 中雨", 61: "🌦 小雨", 63: "🌧 中雨", 65: "🌧 大雨", 66: "🌧 冻雨", 71: "🌨 小雪", 73: "🌨 中雪", 75: "❄️ 大雪", 80: "🌦 阵雨", 81: "🌧 强阵雨", 82: "⛈ 暴雨", 85: "🌨 阵雪", 95: "⛈ 雷雨", 96: "⛈ 雷雨冰雹", 99: "⛈ 强雷雨" };
async function loadTripWeather(force) {
  const t = tripById(curTripId);
  if (!t) return;
  const box = $("#trip-weather");
  if (!force && t.weather && t.weather.fetched === todayStr()) { if (box) box.innerHTML = tripWeatherHtml(t); return; }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(t.city)}&count=1&language=zh&format=json`, { signal: ctrl.signal }).then((r) => r.json());
    const g = geo.results && geo.results[0];
    if (!g) throw new Error("未找到城市「" + t.city + "」的坐标");
    const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`, { signal: ctrl.signal }).then((r) => r.json());
    clearTimeout(timer);
    if (!wx.daily) throw new Error("天气数据获取失败");
    t.weather = {
      fetched: todayStr(), place: g.name,
      days: wx.daily.time.map((d, i) => ({ date: d, code: wx.daily.weather_code[i], max: Math.round(wx.daily.temperature_2m_max[i]), min: Math.round(wx.daily.temperature_2m_min[i]), rain: wx.daily.precipitation_probability_max[i] })),
    };
    save(true);
    if (box) box.innerHTML = tripWeatherHtml(t);
  } catch (e) {
    if (box) box.innerHTML = `<div class="empty">天气获取失败：${esc(e.message)}<br><a href="https://weather.cma.cn/" target="_blank" style="color:var(--primary)">→ 中国天气网查询</a></div>`;
  }
}
function tripWeatherHtml(t) {
  const dates = tripDates(t);
  const inTrip = t.weather.days.filter((d) => dates.includes(d.date));
  const show = inTrip.length ? inTrip : t.weather.days.slice(0, 7);
  const note = inTrip.length ? "" : `<div style="font-size:12px;color:var(--orange);margin-bottom:8px">⚠️ 行程日期超出16天预报范围，先展示近7天天气供参考</div>`;
  const rainDays = inTrip.filter((d) => d.rain >= 60);
  return note + `<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">
    ${show.map((d) => `<div style="flex:none;min-width:86px;text-align:center;border:1px solid var(--line);border-radius:12px;padding:10px 6px">
      <div style="font-size:11px;color:var(--text2)">${d.date.slice(5)}</div>
      <div style="font-size:20px;margin:4px 0">${(WMO_MAP[d.code] || "🌡").split(" ")[0]}</div>
      <div style="font-size:11px">${(WMO_MAP[d.code] || "").split(" ")[1] || ""}</div>
      <div style="font-size:12px;margin-top:3px"><b>${d.min}~${d.max}°</b></div>
      <div style="font-size:11px;color:${d.rain >= 60 ? "var(--red)" : "var(--text2)"}">💧${d.rain}%</div>
    </div>`).join("")}
  </div>
  ${rainDays.length ? `<div style="font-size:12px;color:var(--red);margin-top:8px">☔ ${rainDays.map((d) => d.date.slice(5)).join("、")} 降雨概率高，建议把室内景点（博物馆/商场）排到这些天</div>` : ""}`;
}

/* ---------- 行程导出 / 打印 ---------- */
function exportTripView(id) {
  const t = tripById(id);
  if (!t) return;
  const spend = tripSpend(t);
  const w = window.open("", "_blank");
  if (!w) return toast("浏览器拦截了弹窗，请允许弹窗后重试");
  const planTxt = t.plan ? (typeof t.plan === "string" ? `<pre style="white-space:pre-wrap;font-family:inherit">${esc(t.plan)}</pre>` : planPrintHtml(t)) : "<p>（尚未生成行程规划）</p>";
  w.document.write(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${esc(t.name)} - 行程单</title>
  <style>body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:760px;margin:24px auto;padding:0 20px;color:#1c2333;font-size:14px;line-height:1.8}
  h1{font-size:22px}h2{font-size:16px;border-left:4px solid #4f6ef7;padding-left:8px;margin-top:24px}
  .meta{color:#666;font-size:13px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 10px;font-size:13px;text-align:left}
  @media print{.noprint{display:none}}</style></head><body>
  <button class="noprint" style="padding:8px 18px;background:#4f6ef7;color:#fff;border:none;border-radius:8px;cursor:pointer" onclick="window.print()">🖨 打印 / 存为PDF</button>
  <h1>✈️ ${esc(t.name)}</h1>
  <div class="meta">📍${esc(t.city)} · ${t.startDate} ~ ${t.endDate} · ${tripDates(t).length}天
  ${t.arriveVia ? `<br>🛬 到达：${esc(t.arriveVia)} ${esc(t.arriveTime || "")}` : ""}${t.departVia ? ` · 🛫 离开：${esc(t.departVia)} ${esc(t.departTime || "")}` : ""}
  <br>🏨 ${t.hotelMode === "booked" ? t.hotels.map((h) => esc(h.name)).join("、") || "已订酒店" : "未订酒店（见规划推荐）"}</div>
  <h2>行程规划</h2>${planTxt}
  <h2>景点清单（${t.spots.length}）</h2>
  <table><tr><th>景点</th><th>开放时间</th><th>门票</th><th>建议时长</th></tr>
  ${t.spots.map((s) => `<tr><td>${s.done ? "✅" : "⬜"} ${esc(s.name)}</td><td>${esc(s.info?.hours || "-")}</td><td>${esc(s.info?.ticket || "-")}</td><td>${esc(s.info?.duration || "-")}</td></tr>`).join("")}</table>
  ${spend ? `<h2>已花费</h2><p>${fmtMoney(spend)}</p>` : ""}
  <p class="meta" style="margin-top:30px">由「生活工作台」生成 · ${todayStr()}</p>
  </body></html>`);
  w.document.close();
}
function planPrintHtml(t) {
  const p = t.plan;
  if (!p || !p.days) return "<p>（规划数据格式异常）</p>";
  const head = `${p.hotelStrategy ? `<p>🏨 <b>住宿策略：</b>${esc(p.hotelStrategy)}</p>` : ""}${p.totalCostYuan ? `<p>💰 <b>预计总花费：</b>约 ¥${Math.round(p.totalCostYuan)}</p>` : ""}`;
  const body = p.days.map((d, i) => `<h3 style="font-size:14px">Day ${i + 1} · ${esc(d.date || "")}${d.dayCostYuan ? `（约 ¥${Math.round(d.dayCostYuan)}）` : ""}</h3>
    ${d.hotel && d.hotel.name ? `<p style="font-size:13px">🏨 ${esc(d.hotel.name)}${d.hotel.area ? " · " + esc(d.hotel.area) : ""}${d.hotel.reason ? `（${esc(d.hotel.reason)}）` : ""}</p>` : ""}
    <ol>${(d.items || []).map((it) => `<li>${it.start ? `<b>${esc(it.start)}${it.end ? "-" + esc(it.end) : ""}</b> ` : ""}${esc(it.name || "")}${it.transport ? ` — ${esc(it.transport)}` : ""}${it.costYuan ? `（约¥${it.costYuan}${it.minutes ? "/" + it.minutes + "分钟" : ""}）` : it.minutes ? `（约${it.minutes}分钟）` : ""}${it.tip ? `<br><span style="color:#666;font-size:12px">💡 ${esc(it.tip)}</span>` : ""}</li>`).join("")}</ol>`).join("");
  const tips = p.tips?.length ? `<h3 style="font-size:14px">📌 出行建议</h3><ul>${p.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  return head + body + tips;
}

function spotItemHtml(t, s, archived) {
  const i = s.info;
  return `<div style="border-bottom:1px solid var(--line);padding:10px 2px">
    <div style="display:flex;align-items:center;gap:8px">
      ${archived ? "" : `<div class="checkbox ${s.done ? "on" : ""}" onclick="toggleSpotDone('${s.id}')">${s.done ? "✓" : ""}</div>`}
      <div class="grow" style="flex:1">
        <span style="font-size:14px;${s.done ? "text-decoration:line-through;color:var(--text2)" : ""}"><b>${esc(s.name)}</b></span>
        ${i ? `<span style="font-size:11px;color:var(--text2);margin-left:6px">🕐 ${esc(i.openTime || "开放时间未知")} · 🎫 ${esc(i.ticket || "票价未知")}${i.suggestMinutes ? " · 建议游玩" + Math.round(i.suggestMinutes / 60 * 10) / 10 + "小时" : ""}</span>` : ""}
      </div>
      ${archived ? "" : `
      <button class="btn sm ${i ? "gray" : "ghost"}" onclick="fetchSpotInfo('${s.id}')">${spotLoadingId === s.id ? "…" : (i ? "↻ 攻略" : "🤖 攻略")}</button>
      <button class="icon-btn" onclick="spotSearchLinks(${jsStr(s.name)})">🔎</button>
      <button class="icon-btn" onclick="delSpot('${s.id}')">✕</button>`}
    </div>
    ${i && (i.highlights?.length || i.foods?.length) ? `<div style="margin:6px 0 0 ${archived ? 0 : 28}px">
      ${i.highlights?.length ? `<div style="font-size:12px;margin-bottom:3px"><span style="color:var(--primary)">✨ 值得体验：</span>${i.highlights.map((h) => `<span class="chip">${esc(h)}</span>`).join("")}</div>` : ""}
      ${i.foods?.length ? `<div style="font-size:12px"><span style="color:var(--orange)">🍜 周边美食：</span>${i.foods.map((f) => `<span class="chip">${esc(f)}</span>`).join("")}</div>` : ""}
      ${i.tip ? `<div style="font-size:12px;color:var(--text2);margin-top:3px">💡 ${esc(i.tip)}</div>` : ""}
    </div>` : ""}
  </div>`;
}

/* ---------- 景点 ---------- */
function addSpot() {
  const name = $("#sp-name").value.trim();
  if (!name) return toast("请输入景点名");
  const t = tripById(curTripId);
  if (t.spots.some((s) => s.name === name)) return toast("这个景点已经在清单里了");
  t.spots.push({ id: uid(), name, done: false, info: null });
  save(); renderTripDetail();
}
function delSpot(id) { const t = tripById(curTripId); t.spots = t.spots.filter((s) => s.id !== id); t.updatedAt = Date.now(); save(); renderTripDetail(); }
function toggleSpotDone(id) { const t = tripById(curTripId); const s = t.spots.find((x) => x.id === id); if (s) { s.done = !s.done; save(); renderTripDetail(); } }
function spotSearchLinks(name) {
  const t = tripById(curTripId);
  const q = encodeURIComponent(t.city + " " + name);
  openModal(`<h3>🔎 查看「${esc(name)}」网上攻略</h3>
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px">跳转到对应平台查看真实游客评价与美食推荐：</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <a class="btn ghost" style="text-decoration:none" target="_blank" href="https://www.xiaohongshu.com/search_result?keyword=${q}">📕 小红书攻略</a>
      <a class="btn ghost" style="text-decoration:none" target="_blank" href="https://www.dianping.com/search/keyword/0_0_${q}">🍽️ 大众点评（周边美食）</a>
      <a class="btn ghost" style="text-decoration:none" target="_blank" href="https://www.mafengwo.cn/search/q.php?q=${q}">🐝 马蜂窝游记</a>
      <a class="btn ghost" style="text-decoration:none" target="_blank" href="https://www.baidu.com/s?wd=${q}%20%E5%BC%80%E6%94%BE%E6%97%B6%E9%97%B4%20%E9%97%A8%E7%A5%A8">🔍 百度（开放时间/门票）</a>
    </div>
    <div style="margin-top:12px"><button class="btn gray" onclick="closeModal()">关闭</button></div>`);
}
async function fetchSpotInfo(spotId) {
  const t = tripById(curTripId);
  const s = t.spots.find((x) => x.id === spotId);
  if (!s) return;
  if (!travelAiReady()) { spotSearchLinks(s.name); return toast("未配置 AI，先给你打开攻略搜索；可到「设置」配置 AI 后一键生成"); }
  spotLoadingId = spotId; renderTripDetail();
  try {
    const txt = await travelAiChat(`介绍${t.city}的景点「${s.name}」。只返回JSON，不要其他文字，格式：{"openTime":"开放时间","ticket":"门票价格说明","suggestMinutes":建议游玩分钟数,"highlights":["最值得体验/参观的3-5个点"],"foods":["周边值得吃的3-5个美食或店铺"],"tip":"一句话实用建议(最佳时段/预约/避坑)"}`);
    s.info = pickJson(txt);
    save(); toast(`「${s.name}」攻略已更新`);
  } catch (e) {
    toast("获取失败：" + (e.message === "NO_AI" ? "请先在设置中配置 AI" : e.message));
  }
  spotLoadingId = null; renderTripDetail();
}
async function fetchAllSpotInfo() {
  const t = tripById(curTripId);
  const todo = t.spots.filter((s) => !s.info);
  if (!todo.length) return toast("所有景点都已有攻略");
  if (!travelAiReady()) return toast("请先在「设置」中配置 AI 接口（AI地址/Key/模型）");
  toast(`开始获取 ${todo.length} 个景点攻略，请稍候…`);
  for (const s of todo) {
    spotLoadingId = s.id; renderTripDetail();
    try {
      const txt = await travelAiChat(`介绍${t.city}的景点「${s.name}」。只返回JSON，不要其他文字，格式：{"openTime":"开放时间","ticket":"门票价格说明","suggestMinutes":建议游玩分钟数,"highlights":["最值得体验/参观的3-5个点"],"foods":["周边值得吃的3-5个美食或店铺"],"tip":"一句话实用建议"}`);
      s.info = pickJson(txt); save(true);
    } catch (e) { /* 单个失败继续 */ }
  }
  spotLoadingId = null; save(); renderTripDetail(); toast("景点攻略获取完成");
}

/* ---------- 定位 / 地图 / 附近推荐 ---------- */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, toR = (d) => d * Math.PI / 180;
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function pinSvg(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="32" viewBox="0 0 22 32"><path d="M11 0C5 0 0 5 0 11c0 8 11 21 11 21s11-13 11-21C22 5 17 0 11 0z" fill="${color}"/><circle cx="11" cy="11" r="5" fill="#fff"/></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
/* 动态加载腾讯地图 GL JS（使用用户自己的 Key，非 WorkBuddy 代理模式） */
function ensureTMap(cb) {
  if (window.TMap) return cb();
  if (!D.settings.mapKey) return cb(new Error("NO_KEY"));
  if (window.__tmapLoading) { (window.__tmapQueue = window.__tmapQueue || []).push(cb); return; }
  window.__tmapLoading = true;
  const s = document.createElement("script");
  s.src = "https://map.qq.com/api/gljs?v=1.exp&libraries=service&key=" + encodeURIComponent(D.settings.mapKey);
  s.onload = () => { window.__tmapLoading = false; cb(); (window.__tmapQueue || []).forEach((f) => f()); window.__tmapQueue = []; };
  s.onerror = () => { window.__tmapLoading = false; cb(new Error("地图脚本加载失败（检查 Key 或网络）")); };
  document.head.appendChild(s);
}
/* 周边搜索（腾讯地点搜索 SDK） */
function tmapSearch(keyword, loc, radius) {
  return new Promise((resolve, reject) => {
    try {
      const svc = new TMap.service.Search({ pageSize: 20, pageIndex: 1 });
      svc.search({ keyword, location: new TMap.LatLng(loc.lat, loc.lng), radius, autoExtend: false },
        (res) => resolve((res && res.data) || []),
        (err) => reject(new Error((err && err.message) || "搜索失败")));
    } catch (e) { reject(e); }
  });
}
/* 地理编码（城市+名称 -> 经纬度），带缓存 */
function geocodeName(name, city) {
  const key = (city || "") + "|" + name;
  if (geoCache[key]) return Promise.resolve(geoCache[key]);
  return new Promise((resolve) => {
    try {
      const gc = new TMap.service.Geocoder({});
      gc.getLocation({ address: (city ? city + " " : "") + name }, (res) => {
        const l = res && res.result && res.result.location;
        if (l) { const g = { lat: l.lat, lng: l.lng }; geoCache[key] = g; resolve(g); } else resolve(null);
      }, () => resolve(null));
    } catch (e) { resolve(null); }
  });
}
/* 定位我的位置 */
function locateMe() {
  if (!navigator.geolocation) return toast("当前浏览器不支持定位（建议用手机/Chrome 打开本站）");
  toast("正在获取你的位置…");
  navigator.geolocation.getCurrentPosition((pos) => {
    userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy), ts: new Date().toLocaleTimeString("zh-CN") };
    D.settings.lastLoc = { lat: userLoc.lat, lng: userLoc.lng, acc: userLoc.acc, ts: userLoc.ts };
    save(true); renderTripDetail();
    if (D.settings.mapKey) doNearbySearch();
    else toast("✅ 已定位。配置地图 Key 后可推荐附近景点/美食（设置 → 🗺️ 地图配置）");
  }, (err) => {
    const m = err.code === 1 ? "定位被拒绝，请在浏览器允许定位权限后重试"
      : err.code === 2 ? "定位失败（信号弱或不可用，请到开阔处重试）" : "定位超时，请重试";
    toast(m);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}
/* 附近推荐卡片 */
function nearbyCardHtml(t) {
  return `<div class="card" style="margin-bottom:16px">
    <h3>📍 定位 & 附近推荐
      <button class="more" onclick="locateMe()">${userLoc ? "↻ 重新定位" : "📍 定位我的位置"} ›</button>
      <button class="more" onclick="showSetupGuide('map')">🗺️ 配置指引</button>
    </h3>
    ${userLoc ? `<div style="font-size:12px;color:var(--green);margin-bottom:8px">✅ 已定位（精度约 ${userLoc.acc || "?"} m）${userLoc.ts ? " · " + esc(userLoc.ts) : ""} · 以此为中心推荐附近</div>`
      : `<div style="font-size:12px;color:var(--text2);margin-bottom:8px">点「📍 定位我的位置」获取当前坐标，再按距离推荐附近景点/美食，避免跑太远。</div>`}
    <div class="hot-tabs" style="margin-bottom:8px">
      <button class="hot-tab ${nearbyCtg === "food" ? "active" : ""}" onclick="nearbySetCtg('food')">🍜 美食</button>
      <button class="hot-tab ${nearbyCtg === "spot" ? "active" : ""}" onclick="nearbySetCtg('spot')">🏞️ 景点</button>
      <button class="hot-tab ${nearbyCtg === "kw" ? "active" : ""}" onclick="nearbySetCtg('kw')">🔎 我想吃…</button>
    </div>
    ${nearbyCtg === "kw" ? `<div class="form-row" style="margin-bottom:8px"><input id="nearby-kw" placeholder="输入想吃的，如 火锅 / 川菜 / 烧烤" value="${esc(nearbyKw)}" oninput="nearbyKw=this.value" onkeydown="if(event.key==='Enter')doNearbySearch()"><button class="btn sm" onclick="doNearbySearch()">搜</button></div>` : ""}
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <span style="font-size:12px;color:var(--text2)">范围</span>
      ${[[500, "500m"], [1000, "1km"], [2000, "2km"], [5000, "5km"]].map(([v, n]) => `<button class="hot-tab ${nearbyRadius === v ? "active" : ""}" onclick="nearbySetRadius(${v})">${n}</button>`).join("")}
      <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text2)"><input type="checkbox" ${nearbyWalkOnly ? "checked" : ""} onchange="nearbyWalkToggle(this.checked)" style="width:15px;height:15px"> 只显示步行可达(&lt;1km)</label>
    </div>
    <div id="nearby-box">${nearbyBoxHtml()}</div>
  </div>`;
}
function nearbyBoxHtml() {
  if (!userLoc) return '<div class="empty">尚未定位，点「📍 定位我的位置」获取当前位置后推荐附近</div>';
  if (!D.settings.mapKey) return '<div style="font-size:12px;color:var(--orange);background:var(--primary-soft);border-radius:10px;padding:10px;line-height:1.8">⚠️ 需在「设置 → 🗺️ 地图配置」填写腾讯位置服务 Key 后，才能使用附近推荐与路线地图。<br>免费申请：<a href="https://lbs.qq.com/dev/console/key/manage" target="_blank" style="color:var(--primary)">lbs.qq.com 申请 Key</a>（开启「JavaScriptAPI」「WebServiceAPI」「地点搜索」）</div>';
  if (nearbyLoading) return '<div class="empty">🔍 正在搜索附近…</div>';
  if (!nearbyRes) return '<div class="empty">选好分类与范围，点「搜」查看附近' + (nearbyCtg === "kw" ? "想吃的" : "") + "</div>";
  if (nearbyRes.error) return '<div class="empty">搜索失败：' + esc(nearbyRes.error) + "</div>";
  let list = nearbyRes.list || [];
  if (nearbyWalkOnly) list = list.filter((x) => x.dist <= 1000);
  if (!list.length) return '<div class="empty">附近 ' + (nearbyRadius / 1000) + 'km 内没找到，换个范围或关键词试试</div>';
  const farNote = nearbyRes.far > 0 ? `<div style="font-size:12px;color:var(--red);margin-bottom:8px">⚠️ 其中有 ${nearbyRes.far} 家距离超过 2km，建议优先选「🟢 步行可达」的，省得跑太远</div>` : "";
  return farNote + list.map(nearbyItemHtml).join("");
}
function nearbyDistBadge(dist) {
  if (dist <= 800) return '<span class="tag lo" style="color:var(--green);background:#e8f8ee">🟢 步行 ' + Math.round(dist) + "m</span>";
  if (dist <= 2000) return '<span class="tag orange">🟡 ' + Math.round(dist) + "m</span>";
  return '<span class="tag hi" style="background:#fdeaea;color:var(--red)">🔴 较远 ' + (Math.round(dist / 100) / 10) + "km</span>";
}
function nearbyItemHtml(p) {
  const isFood = nearbyRes.cat !== "spot";
  const walkMin = Math.max(1, Math.round(p.dist / 80)); // 约 5km/h 步行
  return `<div class="list-item">
    <div class="grow">
      <div class="title" style="font-size:13px">${esc(p.name)}</div>
      <div class="sub">${nearbyDistBadge(p.dist)} · 步行约${walkMin}分 ${p.cat ? "· " + esc(p.cat) : ""} ${p.addr ? "· " + esc(p.addr) : ""}</div>
    </div>
    ${isFood
      ? `<button class="btn sm ghost" onclick="window.open('https://www.dianping.com/search/keyword/0_0_' + encodeURIComponent(${jsStr(p.name)}),'_blank')">🔎点评</button><button class="btn sm" onclick="addNearbyShop(${jsStr(p.name)})">+想吃</button>`
      : `<button class="btn sm" onclick="addNearbySpot(${jsStr(p.name)})">+景点</button>`}
  </div>`;
}
async function doNearbySearch() {
  if (!userLoc) return toast("请先点「定位我的位置」");
  if (!D.settings.mapKey) { nearbyRes = { notice: "needKey" }; return renderTripDetail(); }
  let kw;
  if (nearbyCtg === "food") kw = "美食";
  else if (nearbyCtg === "spot") kw = "景点";
  else kw = (($("#nearby-kw") && $("#nearby-kw").value.trim()) || nearbyKw || "美食");
  if (nearbyCtg === "kw") nearbyKw = kw;
  nearbyLoading = true; renderTripDetail();
  try {
    const res = await tmapSearch(kw, userLoc, nearbyRadius);
    const list = res.map((p) => ({
      name: p.title, addr: p.address || "", cat: p.category || "",
      lat: p.location.lat, lng: p.location.lng,
      dist: haversine(userLoc.lat, userLoc.lng, p.location.lat, p.location.lng),
    })).filter((x) => x.lat);
    list.sort((a, b) => a.dist - b.dist);
    const far = list.filter((x) => x.dist > 2000).length;
    nearbyRes = { list, far, kw, cat: nearbyCtg, radius: nearbyRadius };
  } catch (e) { nearbyRes = { error: e.message }; }
  nearbyLoading = false; renderTripDetail();
}
function nearbySetCtg(c) { nearbyCtg = c; nearbyRes = null; renderTripDetail(); }
function nearbySetRadius(r) { nearbyRadius = r; if (userLoc && nearbyRes && !nearbyRes.notice && !nearbyRes.error) doNearbySearch(); else renderTripDetail(); }
function nearbyWalkToggle(v) { nearbyWalkOnly = v; renderTripDetail(); }
function addNearbySpot(name) {
  const t = tripById(curTripId); if (!t) return;
  name = String(name || "").trim(); if (!name) return;
  if (t.spots.some((s) => s.name === name)) return toast("已在景点清单里");
  t.spots.push({ id: uid(), name, done: false, info: null });
  save(); renderTripDetail(); toast("已加入景点：" + name);
}
function addNearbyShop(name) {
  name = String(name || "").trim(); if (!name) return;
  if (D.shopping.some((s) => s.name === name)) return toast("已在购物清单里");
  D.shopping.push({ id: uid(), name, url: "", platform: "附近想吃", status: "want", price: 0, note: "旅行附近推荐 · " + (tripById(curTripId) ? tripById(curTripId).city : "") });
  save(); toast("已加入购物清单（想吃）：" + name);
}
/* 路线地图（腾讯地图） */
function renderRouteMap(t) {
  const idDetail = "route-map-" + t.id, idModal = "route-map-modal-" + t.id;
  const el = document.getElementById(idDetail) || document.getElementById(idModal);
  if (!el) return;
  [idDetail, idModal].forEach((k) => { if (mapInstances[k]) { try { mapInstances[k].destroy(); } catch (e) {} delete mapInstances[k]; } });
  if (!D.settings.mapKey) { el.innerHTML = '<div class="empty">配置地图 Key 后显示路线地图（设置 → 🗺️ 地图配置）</div>'; return; }
  ensureTMap((err) => {
    if (err) { el.innerHTML = '<div class="empty">地图加载失败：' + (err.message || err) + "</div>"; return; }
    try {
      const center = userLoc ? new TMap.LatLng(userLoc.lat, userLoc.lng) : new TMap.LatLng(39.9, 116.4);
      const map = new TMap.Map(el, { zoom: 12, center });
      mapInstances[el.id] = map;
      const pts = [];
      if (t.arriveVia) pts.push({ name: t.arriveVia, type: "arrive" });
      t.spots.forEach((s) => pts.push({ name: s.name, type: "spot" }));
      if (t.hotelMode === "booked") (t.hotels || []).forEach((h) => pts.push({ name: ((h.name || "") + " " + (h.addr || "")).trim(), type: "checkin" }));
      if (t.departVia) pts.push({ name: t.departVia, type: "depart" });
      if (!pts.length) { el.innerHTML = '<div class="empty">添加景点或到/离站后显示路线</div>'; return; }
      Promise.all(pts.map((p) => geocodeName(p.name, t.city).then((g) => g ? { ...p, lat: g.lat, lng: g.lng } : null).catch(() => null)))
        .then((found) => {
          const geos = found.filter(Boolean);
          const nb = (nearbyRes && nearbyRes.list) ? nearbyRes.list : [];
          if (!geos.length && !nb.length && !userLoc) { el.innerHTML = '<div class="empty">暂无可定位的地点（景点需有名称）</div>'; return; }
          const geometries = geos.map((g, i) => ({ id: String(i), styleId: g.type, position: new TMap.LatLng(g.lat, g.lng), properties: { title: g.name } }));
          nb.forEach((p, i) => { if (p.lat) geometries.push({ id: "nb" + i, styleId: "nearby", position: new TMap.LatLng(p.lat, p.lng), properties: { title: p.name } }); });
          if (userLoc) geometries.push({ id: "me", styleId: "me", position: new TMap.LatLng(userLoc.lat, userLoc.lng), properties: { title: "我的位置" } });
          const paths = geos.map((g) => new TMap.LatLng(g.lat, g.lng));
          new TMap.MultiMarker({ map, geometries, styles: {
            arrive: new TMap.MarkerStyle({ width: 22, height: 32, src: pinSvg("#2bb673") }),
            spot: new TMap.MarkerStyle({ width: 22, height: 32, src: pinSvg("#4f6ef7") }),
            checkin: new TMap.MarkerStyle({ width: 22, height: 32, src: pinSvg("#f59e0b") }),
            depart: new TMap.MarkerStyle({ width: 22, height: 32, src: pinSvg("#ef4444") }),
            nearby: new TMap.MarkerStyle({ width: 20, height: 28, src: pinSvg("#16a34a") }),
            me: new TMap.MarkerStyle({ width: 20, height: 20, src: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="%231d4ed8" stroke="%23fff" stroke-width="3"/></svg>') }),
          } });
          if (paths.length > 1) new TMap.MultiPolyline({ map, geometries: [{ id: "r", styleId: "r", paths }], styles: { r: new TMap.PolylineStyle({ color: 0x4f6ef7, width: 5, lineCap: "round" }) } });
          const ctr = userLoc ? new TMap.LatLng(userLoc.lat, userLoc.lng) : (geos[0] ? new TMap.LatLng(geos[0].lat, geos[0].lng) : (nb[0] ? new TMap.LatLng(nb[0].lat, nb[0].lng) : new TMap.LatLng(39.9, 116.4)));
          map.setCenter(ctr);
        });
    } catch (e) { el.innerHTML = '<div class="empty">地图渲染失败：' + esc(e.message) + "</div>"; }
  });
}

/* ---------- 路线总览 / AI 必吃必玩 ---------- */
function routeHtml(t, mapId) {
  const mid = mapId || ("route-map-" + t.id);
  let days;
  if (t.plan && t.plan.days && t.plan.days.length) days = t.plan.days;
  else days = [{ date: t.startDate, items: [
    ...(t.arriveVia ? [{ type: "arrive", name: "抵达 " + t.arriveVia }] : []),
    ...t.spots.map((s) => ({ type: "spot", name: s.name, done: s.done })),
    ...(t.departVia ? [{ type: "depart", name: "前往 " + t.departVia + " 返程" }] : []),
  ] }];
  const wp = days.flatMap((d, di) => (d.items || []).map((it) => ({ ...it, day: di + 1, date: d.date })));
  if (!wp.length) return '<div class="empty">还没有路线，添加景点或生成规划后查看</div>';
  const colorOf = (ty) => ty === "depart" ? "var(--red)" : ty === "arrive" ? "var(--teal)" : ty === "meal" ? "var(--orange)" : ty === "transit" ? "var(--text2)" : "var(--primary)";
  const mapBox = D.settings.mapKey
    ? `<div id="${mid}" style="width:100%;height:260px;border-radius:12px;margin-bottom:14px;background:var(--bg);overflow:hidden"></div>`
    : `<div style="font-size:12px;color:var(--text2);background:var(--primary-soft);border-radius:10px;padding:10px;margin-bottom:14px">🗺️ 配置地图 Key 后，这里会显示真实路线地图（设置 → 🗺️ 地图配置）。</div>`;
  return `${mapBox}<div style="position:relative;padding-left:26px;max-height:340px;overflow-y:auto">
    <div style="position:absolute;left:10px;top:6px;bottom:6px;width:2px;background:var(--line)"></div>
    ${wp.map((w) => `
      <div style="position:relative;margin-bottom:14px">
        <div style="position:absolute;left:-22px;top:2px;width:14px;height:14px;border-radius:50%;background:${colorOf(w.type)};border:2px solid var(--bg);box-shadow:0 0 0 2px var(--line)"></div>
        <div style="font-size:12px;color:var(--text2)">Day ${w.day} · ${w.date}</div>
        <div style="font-size:14px">${TL_ICONS[w.type] || "•"} ${esc(w.name)} ${w.done ? '<span class="tag lo" style="font-size:10px">已打卡</span>' : ""}</div>
      </div>`).join("")}
  </div>`;
}
function openRouteModal(id) {
  const t = tripById(id); if (!t) return;
  openModal(`<h3>🗺️ ${esc(t.name)} · 路线总览</h3><div style="margin-top:10px">${routeHtml(t, "route-map-modal-" + t.id)}</div><div style="margin-top:12px"><button class="btn gray" onclick="closeModal()">关闭</button></div>`);
  renderRouteMap(t);
}
async function aiCityPicks() {
  const t = tripById(curTripId);
  if (!t) return;
  if (!travelAiReady()) return toast("请先在「设置→AI 配置」填写接口，或点景点后的「攻略」按钮看网上攻略");
  toast("🤖 AI 正在生成「" + t.city + "」必吃必玩…");
  try {
    const have = t.spots.map((s) => s.name).join("、") || "无";
    const txt = await travelAiChat(`为去「${t.city}」旅行的游客推荐最值得体验的。只返回JSON，不要其他文字，格式：{"mustEat":["3-6个必吃美食/餐厅"],"mustSee":["3-6个必去景点/体验(尽量与已加清单不重复)"],"tip":"一句话实用建议"}。已加景点：${have}`);
    const p = pickJson(txt);
    const eats = p.mustEat || [], picks = p.mustSee || [];
    openModal(`<h3>🤖 ${esc(t.city)} · AI 必吃必玩</h3>
      <div style="font-size:13px;color:var(--text2);margin:6px 0 10px">${esc(p.tip || "")}</div>
      <div style="font-size:13px;font-weight:700;margin:6px 0 4px">🍜 必吃</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${eats.length ? eats.map((e) => `<span class="chip">${esc(e)}</span>`).join("") : '<span class="empty">暂无</span>'}</div>
      <div style="font-size:13px;font-weight:700;margin:12px 0 4px">🏞️ 必玩（可一键加入景点）</div>
      ${picks.length ? picks.map((e) => `<div class="list-item"><div class="grow"><div class="title" style="font-size:13px">${esc(e)}</div></div><button class="btn sm" onclick="addSpotNamed(${jsStr(e)})">+ 加入</button></div>`).join("") : '<div class="empty">暂无</div>'}
      <div style="margin-top:12px"><button class="btn gray" onclick="closeModal()">关闭</button></div>`);
  } catch (e) { toast("获取失败：" + (e.message === "NO_AI" ? "请先配置 AI" : e.message)); }
}
function addSpotNamed(name) {
  const t = tripById(curTripId);
  if (!t) return;
  name = String(name || "").trim();
  if (!name) return;
  if (t.spots.some((s) => s.name === name)) { closeModal(); return toast("已在清单里"); }
  t.spots.push({ id: uid(), name, done: false, info: null });
  save(); closeModal(); renderTripDetail(); toast("已加入景点：" + name);
}

/* ---------- 智能规划 ---------- */
function openPlanModal() {
  const t = tripById(curTripId);
  if (!t.spots.length) return toast("请先添加想去的景点");
  const habits = travelHabitTexts();
  openModal(`<h3>⚡ 生成智能行程规划</h3>
    <div style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:10px">
      将根据 <b>${t.spots.length} 个景点</b>、${tripDates(t).length} 天行程、到离站点${t.hotelMode === "booked" ? "、已订酒店（每日起终点）" : "，并智能推荐每天最优住宿区（可多天换酒店）"}规划：
      景点游览顺序、每段出行方式、预计费用与耗时、每日餐饮建议。
      ${habits.length ? `<br>🧭 将参考你的 ${habits.length} 条旅行习惯自动优化。` : ""}
    </div>
    <label class="fl">补充要求（可选）</label>
    <textarea id="plan-extra" rows="2" placeholder="如：带老人小孩节奏放慢 / 预算控制在2000内 / 第一天不要排太满"></textarea>
    ${travelAiReady() ? "" : '<div style="font-size:12px;color:var(--orange);margin-top:8px">⚠️ 未配置 AI：将生成基础排期（均分景点）。到「设置→AI 配置」填好接口后可智能规划最优路径。</div>'}
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn" onclick="genPlan()">开始规划</button>
      <button class="btn gray" onclick="closeModal()">取消</button>
    </div>`);
}
function travelHabitTexts() {
  const arr = (D.travelHabits || []).map((h) => h.text);
  return arr.slice(0, 20);
}
async function genPlan() {
  const t = tripById(curTripId);
  const extra = $("#plan-extra") ? $("#plan-extra").value.trim() : "";
  closeModal();
  if (!travelAiReady()) { t.plan = basicPlan(t); save(); renderTripDetail(); return toast("已生成基础排期（配置 AI 后可智能规划）"); }
  planLoading = true; renderTripDetail();
  try {
    const txt = await travelAiChat(buildPlanPrompt(t, extra));
    const p = pickJson(txt);
    if (!p.days || !Array.isArray(p.days)) throw new Error("规划格式异常，请重试");
    p.mode = "ai"; p.generatedAt = todayStr();
    t.plan = p; save(); toast("智能规划完成 🎉");
  } catch (e) {
    toast("规划失败：" + e.message + "，可重试或检查 AI 配置");
  }
  planLoading = false; renderTripDetail();
}
function buildPlanPrompt(t, extra) {
  const days = tripDates(t);
  const spots = t.spots.map((s) => {
    let line = s.name;
    if (s.info) {
      const bits = [];
      if (s.info.openTime) bits.push("开放:" + s.info.openTime);
      if (s.info.ticket) bits.push("门票:" + s.info.ticket);
      if (s.info.suggestMinutes) bits.push("建议游玩" + s.info.suggestMinutes + "分钟");
      if (bits.length) line += "（" + bits.join("；") + "）";
    }
    return "- " + line;
  }).join("\n");
  const hotelPart = t.hotelMode === "booked"
    ? `已预订酒店（必须作为对应日期每天的出发点和终点）：\n${t.hotels.map((h) => `- ${h.name}${h.addr ? "（" + h.addr + "）" : ""} ${h.from || t.startDate}入住 至 ${h.to || t.endDate}退房`).join("\n")}`
    : `尚未预订酒店：请根据景点地理分布 + 到达站点（${t.arriveVia || "未知"}）+ 离开站点（${t.departVia || "未知"}），为每天推荐最优住宿区域和具体酒店类型建议；如果分区游览更省时间，允许中途换一次酒店；在每一天的 hotel 字段给出推荐并说明理由。`;
  const habits = travelHabitTexts();
  return `你是专业旅行规划师，请为以下旅行生成逐日最优行程。只返回JSON，不要任何其他文字。

【旅行信息】
城市：${t.city}
日期：${t.startDate} 至 ${t.endDate}，共${days.length}天
到达：${t.startDate} ${t.arriveTime || ""} 抵达 ${t.arriveVia || "（未填写）"}
离开：${t.endDate} ${t.departTime || ""} 从 ${t.departVia || "（未填写）"} 出发（请预留足够赶车/机时间）
${hotelPart}

【想去的景点】
${spots}

${habits.length ? "【我的旅行习惯（历史经验，规划时必须参考）】\n" + habits.map((h) => "- " + h).join("\n") + "\n" : ""}${extra ? "【本次补充要求】\n" + extra + "\n" : ""}
【规划要求】
1. 按地理位置就近原则给景点排序分天，避免走回头路；考虑景点开放时间；第一天从到达站点开始，最后一天以离开站点结束
2. 每天从当天酒店出发、回到当天酒店结束（换酒店日先退房寄存/带行李）
3. 相邻两点之间给出 transit 项：具体出行方式（地铁x号线/公交/步行/打车）、预计费用costYuan(元)与耗时minutes(分钟)
4. 每天安排午餐/晚餐 meal 项，优先当地特色/景点周边美食，给预计人均费用
5. spot 项给出预计游玩minutes与门票costYuan
6. 严格按此JSON输出：
{"days":[{"date":"YYYY-MM-DD","hotel":{"name":"酒店名或推荐住宿区","area":"商圈/区域","reason":"选择理由(未订酒店时必填)"},"items":[{"start":"09:00","end":"10:30","type":"arrive|checkin|spot|transit|meal|free|depart","name":"名称","transport":"出行方式(transit项必填)","costYuan":0,"minutes":0,"tip":"提示(可选)"}],"dayCostYuan":0}],"hotelStrategy":"整体住宿策略一句话","totalCostYuan":0,"tips":["3-5条本次行程实用建议"]}`;
}
function basicPlan(t) {
  const days = tripDates(t);
  const per = Math.ceil(t.spots.length / Math.max(days.length, 1));
  let idx = 0;
  const dayObjs = days.map((date, di) => {
    const items = [];
    if (di === 0 && t.arriveVia) items.push({ start: t.arriveTime || "12:00", end: "", type: "arrive", name: "抵达 " + t.arriveVia, costYuan: 0, minutes: 0 });
    if (di === 0) items.push({ start: "", end: "", type: "checkin", name: t.hotelMode === "booked" && t.hotels[0] ? "入住 " + t.hotels[0].name : "入住酒店（建议订在景点集中区域）", costYuan: 0, minutes: 0 });
    let h = di === 0 ? 14 : 9;
    for (let k = 0; k < per && idx < t.spots.length; k++, idx++) {
      const s = t.spots[idx];
      if (k > 0 || di > 0) items.push({ start: "", end: "", type: "transit", name: "前往 " + s.name, transport: "地铁/打车", costYuan: 15, minutes: 30 });
      items.push({ start: `${pad(h)}:00`, end: `${pad(Math.min(h + 2, 22))}:00`, type: "spot", name: s.name, costYuan: 0, minutes: 120, tip: s.info?.tip || "" });
      h = Math.min(h + 3, 20);
    }
    items.push({ start: "18:30", end: "", type: "meal", name: "晚餐 · 当地特色（待定）", costYuan: 60, minutes: 60 });
    if (di === days.length - 1 && t.departVia) items.push({ start: t.departTime || "18:00", end: "", type: "depart", name: "前往 " + t.departVia + " 返程", transport: "地铁/打车", costYuan: 20, minutes: 40 });
    return { date, hotel: { name: t.hotelMode === "booked" ? (t.hotels[0]?.name || "已订酒店") : "建议住景点集中区/交通枢纽附近", area: "", reason: "" }, items, dayCostYuan: items.reduce((a, b) => a + (+b.costYuan || 0), 0) };
  });
  return { days: dayObjs, hotelStrategy: t.hotelMode === "booked" ? "按已订酒店安排" : "未配置AI，仅给出通用建议：优先住地铁沿线、景点密集区", totalCostYuan: dayObjs.reduce((a, b) => a + b.dayCostYuan, 0), tips: ["这是基础排期（未配置 AI）。到「设置→AI 配置」填写接口后重新生成，可获得最优路径、真实票价与美食推荐。"], mode: "basic", generatedAt: todayStr() };
}
function planHtml(t) {
  const p = t.plan;
  return `
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
    <span class="tag ${p.mode === "ai" ? "blue" : "orange"}">${p.mode === "ai" ? "AI 智能规划" : "基础排期"} · ${p.generatedAt || ""}</span>
    ${p.totalCostYuan ? `<span class="tag teal">预计总花费 ¥${Math.round(p.totalCostYuan)}</span>` : ""}
  </div>
  ${p.hotelStrategy ? `<div style="font-size:13px;background:var(--primary-soft);border-radius:10px;padding:10px 12px;margin-bottom:12px">🏨 <b>住宿策略：</b>${esc(p.hotelStrategy)}</div>` : ""}
  <div class="grid cols-2">
  ${p.days.map((d, i) => `
    <div style="border:1px solid var(--line);border-radius:12px;padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <b>Day ${i + 1} · ${d.date}</b>
        ${d.dayCostYuan ? `<span class="tag hi">约 ¥${Math.round(d.dayCostYuan)}</span>` : ""}
      </div>
      ${d.hotel && d.hotel.name ? `<div style="font-size:12px;color:var(--text2);margin-bottom:8px">🏨 ${esc(d.hotel.name)}${d.hotel.area ? " · " + esc(d.hotel.area) : ""}${d.hotel.reason ? `<br><span style="color:var(--primary)">↳ ${esc(d.hotel.reason)}</span>` : ""}</div>` : ""}
      <div class="tl">
        ${(d.items || []).map((it) => `
        <div class="tl-item ${it.type === "transit" ? "transit" : ""}">
          <div style="font-size:13px">
            ${it.start ? `<b style="color:var(--primary)">${it.start}${it.end ? "-" + it.end : ""}</b> ` : ""}
            ${TL_ICONS[it.type] || "•"} ${esc(it.name)}
            ${it.transport ? `<span class="chip">${esc(it.transport)}</span>` : ""}
          </div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">
            ${it.minutes ? "约" + it.minutes + "分钟" : ""}${it.costYuan ? " · ¥" + it.costYuan : ""}${it.tip ? " · 💡" + esc(it.tip) : ""}
          </div>
        </div>`).join("")}
      </div>
    </div>`).join("")}
  </div>
  ${p.tips?.length ? `<div style="margin-top:12px;font-size:13px"><b>📌 出行建议</b><ul style="margin:6px 0 0 18px;line-height:1.9;color:var(--text2)">${p.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}`;
}

/* ---------- 旅行记账 ---------- */
function addTripMoney() {
  const amount = parseFloat($("#tm-amount").value);
  if (!amount || amount <= 0) return toast("请输入金额");
  const t = tripById(curTripId);
  D.money.push({
    id: uid(), date: $("#tm-date").value || todayStr(), type: "支出",
    cat: $("#tm-cat").value, amount, note: $("#tm-note").value.trim(),
    tripId: t.id, inTotal: $("#tm-intotal").checked,
  });
  save(); renderTripDetail(); toast($("#tm-intotal").checked ? "已记账（计入总账）" : "已记账（仅旅行账本，不计入总账）");
}
function toggleTripMoneyTotal(id) {
  const x = D.money.find((m) => m.id === id);
  if (x) { x.inTotal = x.inTotal === false ? true : false; save(); renderTripDetail(); toast(x.inTotal ? "已计入总账" : "已从总账中排除"); }
}
function delTripMoney(id) { tombstone(id); D.money = D.money.filter((x) => x.id !== id); save(); renderTripDetail(); }

/* ---------- 归档与习惯沉淀 ---------- */
function openArchiveModal(id) {
  const t = tripById(id);
  const actual = tripSpend(t);
  openModal(`<h3>📦 归档「${esc(t.name)}」</h3>
    <div style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:10px">
      本次旅行共 ${tripDates(t).length} 天 · ${t.spots.filter((s) => s.done).length}/${t.spots.length} 个景点已打卡 · 实际花费 <b>${fmtMoney(actual)}</b><br>
      写下这次的经验教训，会沉淀为你的「旅行习惯」，下次做计划时 AI 自动参考迭代优化。
    </div>
    <label class="fl">本次旅行经验（每行一条，如：一天安排别超过3个景点 / 提前一周抢门票）</label>
    <textarea id="ar-exp" rows="5" placeholder="例：&#10;博物馆类要提前3天预约&#10;当地打车比地铁更划算&#10;下次订酒店优先地铁站500米内"></textarea>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn" onclick="archiveTrip('${t.id}')">确认归档</button>
      <button class="btn gray" onclick="closeModal()">取消</button>
    </div>`);
}
function archiveTrip(id) {
  const t = tripById(id);
  const exp = $("#ar-exp").value.trim();
  t.status = "archived";
  t.archive = { date: todayStr(), experience: exp, actualCost: tripSpend(t) };
  if (exp) {
    exp.split("\n").map((l) => l.trim()).filter(Boolean).forEach((line) => {
      D.travelHabits.push({ id: uid(), text: line, from: t.name, date: todayStr() });
    });
  }
  save(); closeModal(); renderTripDetail();
  toast("已归档 🎉 经验已沉淀到「个人旅行习惯」");
}
function addTravelHabit() {
  const v = $("#th-text").value.trim();
  if (!v) return toast("请输入内容");
  D.travelHabits.push({ id: uid(), text: v, from: "手动添加", date: todayStr() });
  save(); renderTravelHome();
}
function delTravelHabit(id) { tombstone(id); D.travelHabits = D.travelHabits.filter((h) => h.id !== id); save(); renderTravelHome(); }