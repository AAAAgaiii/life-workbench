/* ===================== 小红书知识库模块（并入生活工作台） ===================== */
"use strict";
/* 数据存于全局 D.xhsNotes / D.xhsCats，随工作台统一云同步与本地备份。
   JSON 备份/恢复统一走「设置 → 数据备份」（见 app.js exportData/importData），
   本模块只负责内容导出（CSV / Markdown / Hugo）与浏览/编辑/批量管理。
   仅 UI 状态（筛选/搜索/排序/多选）用模块级变量，不入同步。 */

/* ---------- 示例数据（首次进入播种） ---------- */
const XHS_SEED = {
  cats: [
    { id: "ai", name: "AI工具" }, { id: "finance", name: "商业财经" },
    { id: "social", name: "社会观察" }, { id: "exam", name: "公考学习" },
    { id: "growth", name: "学习成长" }, { id: "travel", name: "旅行摄影" },
    { id: "baby", name: "育儿母婴" }, { id: "film", name: "文学影视" },
    { id: "city", name: "城市生活" }, { id: "food", name: "美食料理" },
    { id: "default", name: "默认" },
  ],
  notes: [
    { title: "把 GPT 当第二大脑的 7 个正确姿势", cat: "ai", likes: 4250, author: "大K工具箱", url: "https://www.xiaohongshu.com/explore/example-11", tags: "GPT,提示词", memo: "重点：把常用提示词存成模板，别每次重写。" },
    { title: "Notion + AI 工作流：把一周节省 8 小时", cat: "ai", likes: 1832, author: "效率派", url: "https://www.xiaohongshu.com/explore/example-12", tags: "Notion,自动化" },
    { title: "Midjourney 角色一致性 3 个超实用小技巧", cat: "ai", likes: 6204, author: "AI视觉日记", url: "https://www.xiaohongshu.com/explore/example-13", tags: "Midjourney" },
    { title: "把 Claude 当私人导师：完整提示词模板", cat: "ai", likes: 980, author: "小瑞实验室", url: "https://www.xiaohongshu.com/explore/example-14", tags: "Claude" },
    { title: "意子全免光", cat: "finance", likes: 1085, author: "小红薯观察员", url: "https://www.xiaohongshu.com/explore/example-01", tags: "" },
    { title: "花都不卷（日更版）", cat: "finance", likes: 3204, author: "江南小记", url: "https://www.xiaohongshu.com/explore/example-02", tags: "日更" },
    { title: "我用 4 个账户坚持打新，自投一台小汽车", cat: "finance", likes: 1030, author: "作家山溪小镇派工作室", url: "https://www.xiaohongshu.com/explore/example-03", tags: "理财,打新" },
    { title: "小县城的开杂货铺？🖤 为什么有那么多连锁店", cat: "finance", likes: 45213, author: "摩天轮很久", url: "https://www.xiaohongshu.com/explore/example-04", tags: "下沉市场" },
    { title: "放大版星座图的修练方法：做最提气的❤+放大", cat: "finance", likes: 1047, author: "金猫的蜜糖", url: "https://www.xiaohongshu.com/explore/example-05", tags: "星座,自我提升" },
    { title: '"癞羊驼"乱象！探访杭州被吐槽跟拍卖道', cat: "finance", likes: 888, author: "余洲邮间", url: "https://www.xiaohongshu.com/explore/example-06", tags: "深度调查" },
    { title: "又一个义乌老板被拼了", cat: "finance", likes: 715, author: "妙兆·义乌早报同图林金服招", url: "https://www.xiaohongshu.com/explore/example-07", tags: "电商" },
    { title: "谁家那个被吓了一家小咖商家 APP 都在跳钱提现", cat: "finance", likes: 7320, author: "流浪小鱼", url: "https://www.xiaohongshu.com/explore/example-08", tags: "监管" },
    { title: "华语兄弟申请破产重组", cat: "city", likes: 775, author: "浪淘新闻", url: "https://www.xiaohongshu.com/explore/example-09", tags: "影视,资本" },
    { title: "很多人根本没意识到这个时代最大的红利", cat: "city", likes: 1570, author: "孙仁郑", url: "https://www.xiaohongshu.com/explore/example-10", tags: "趋势" },
    { title: "县域经济观察：不是每个小城都值得留下来", cat: "social", likes: 2310, author: "县域笔记", url: "https://www.xiaohongshu.com/explore/example-15", tags: "县域" },
    { title: "结婚率持续下降，背后真实原因", cat: "social", likes: 3380, author: "时代切片", url: "https://www.xiaohongshu.com/explore/example-16", tags: "人口" },
    { title: "为什么“躺平”成了一代人的共识", cat: "social", likes: 5012, author: "社会显微镜", url: "https://www.xiaohongshu.com/explore/example-17", tags: "青年" },
    { title: "公考面试：结构化答题万能框架（亲测有效）", cat: "exam", likes: 1610, author: "上岸日记", url: "https://www.xiaohongshu.com/explore/example-18", tags: "面试" },
    { title: "行测资料分析：3 步搞定比值增长率", cat: "exam", likes: 990, author: "数量关系不头疼", url: "https://www.xiaohongshu.com/explore/example-19", tags: "行测" },
    { title: "申论大作文万能结尾 5 套模板", cat: "exam", likes: 720, author: "申论蘑菇", url: "https://www.xiaohongshu.com/explore/example-20", tags: "申论" },
    { title: "晨型人 21 天：从赖床到 5 点半自然醒", cat: "growth", likes: 540, author: "自我重建中", url: "https://www.xiaohongshu.com/explore/example-21", tags: "作息" },
    { title: "把读书笔记做成卡片，三步沉淀到知识库", cat: "growth", likes: 820, author: "第二大脑实践", url: "https://www.xiaohongshu.com/explore/example-22", tags: "读书,笔记", memo: "我的实践：每天固定 20 分钟做卡片，月底回顾一次。" },
    { title: "国庆 7 天小众路线｜避开人山人海的福建霞浦", cat: "travel", likes: 6880, author: "慢旅者", url: "https://www.xiaohongshu.com/explore/example-23", tags: "霞浦,摄影" },
    { title: "北海道冬日 5 日｜札幌-小樽-函馆-星野", cat: "travel", likes: 5120, author: "搭车去旅行", url: "https://www.xiaohongshu.com/explore/example-24", tags: "日本,冬日" },
    { title: "0-3 岁绘本清单｜分龄推荐 50 本", cat: "baby", likes: 4220, author: "当妈不焦虑", url: "https://www.xiaohongshu.com/explore/example-25", tags: "绘本" },
    { title: "宝宝第一口辅食：7 日过渡方案", cat: "baby", likes: 1932, author: "辅食研究所", url: "https://www.xiaohongshu.com/explore/example-26", tags: "辅食" },
    { title: "重读《活着》：20 岁的眼泪，30 岁的沉默", cat: "film", likes: 2105, author: "重读经典", url: "https://www.xiaohongshu.com/explore/example-27", tags: "余华,书评" },
    { title: "诺兰《奥本海默》历史背景详解｜附时间线", cat: "film", likes: 3802, author: "电影拆解", url: "https://www.xiaohongshu.com/explore/example-28", tags: "诺兰" },
    { title: "在小县城修自行车：一种慢慢来的活法", cat: "city", likes: 770, author: "本地观察", url: "https://www.xiaohongshu.com/explore/example-29", tags: "城市" },
    { title: "下班 30 分钟｜5 套厨房懒人晚餐", cat: "food", likes: 4255, author: "深夜厨房", url: "https://www.xiaohongshu.com/explore/example-30", tags: "快手菜" },
    { title: "回锅肉家常做法｜炒到起灯盏窝的秘诀", cat: "food", likes: 1840, author: "川味研究所", url: "https://www.xiaohongshu.com/explore/example-31", tags: "川菜" },
  ],
};

/* ---------- 关键词自动归类（单一数据源，与归类逻辑同源） ---------- */
const XHS_KEYWORDS = {
  ai: ["ai","gpt","chatgpt","claude","midjourney","sora","提示词","大模型","人工智能","智能体","agent","cursor","notion","自动化","工作流","效率工具","ai工具","文生图","文生视频","数字人","算力","绘图","copilot","suno","配音","语音克隆","生图","生视频","chat","机器人","算法","文心","通义","智谱","kimi","豆包","llm","提示工程"],
  finance: ["理财","投资","股票","基金","打新","副业","赚钱","创业","电商","公司","资本","市场","消费","房价","工资","失业","存款","通胀","汇率","黄金","比特币","经济","财经","商业","财报","上市","估值","股息","储蓄","躺赚","变现","复利","回本","成本","加盟","门店","生意","融资","股权","韭菜","割韭菜","美股","a股","开户","定投","保险","退税","公积金","房贷","月供","年终","涨薪","攒钱","存钱","闲鱼","搞钱","收入","穷","富","薪","现金流","负债","破产"],
  social: ["社会","观察","人口","结婚","躺平","青年","现象","底层","国人","时代","趋势","现实","真相","争议","舆情","贫富","焦虑","内卷","原生家庭","养老","医疗","社保","生育","性别","地域","人性","共鸣","清醒","认知","阶层","心理","情绪","内耗","mbti","人格","敏感","婚姻","亲密","社交","孤独","自卑","拧巴","讨好","代际","独生","留守","空巢","啃老","催婚","催生","婆媳","异地","三观","边界感"],
  exam: ["公考","考公","公务员","行测","申论","上岸","编制","事业单位","考研","考试","笔试","公基","时政","押题","题库","教资","教编","四六级","雅思","托福","注会","法考","一建","二建","资格证"],
  growth: ["学习","成长","读书","笔记","自律","习惯","早起","方法","复盘","提升","英语","技能","知识","干货","拖延","专注","冥想","自我","思维","开阔","刻意练习","费曼","康奈尔","手帐","书单","阅读","高考","报志愿","志愿","自学","时间管理","效率","记忆","写作","表达","健身","运动","训练","体态","刷脂","塑形","瑜伽","跑步","脑力","表达力","逻辑","结构化","思考","戒","晨间","能量","点醒","自我探索","驱动力","探索","情绪价值"],
  travel: ["旅行","旅游","摄影","路线","攻略","风景","民宿","自驾","机票","出境","小众","周末","打卡","citywalk","city walk","徒步","露营","滤镜","相机","调色","出片","机位","签证","海岛","雪山","草原","人像","后期","拍照","旅拍","写真","胶片","构图","修图","探店","景点","古镇","骑行","潜水","滑雪","野餐","日落","夜景","正片","外景","返图","萤火虫","漫展","团片","手电筒","闪光灯","滤色片","减光镜","灯光","动作参考","焚决","绝区零","cos团"],
  baby: ["育儿","母婴","宝宝","婴儿","辅食","绘本","怀孕","宝妈","玩具","幼儿园","亲子","月子","奶粉","纸尿裤","早教","哄睡","孕","童装","新生儿","带娃","孕妇","产检","母乳","发烧","黄疸","坐月子"],
  film: ["文学","影视","电影","剧","小说","书评","余华","诺兰","纪录片","原著","诗歌","名著","影评","追剧","豆瓣","台词","韩剧","美剧","动漫","漫画","甄嬛","红楼梦","三体","村上春树","文案","语录","句子","短句","自存","朋友圈","文青","金句","摘抄","歌词","id自存","小众歌","民谣","诗集","随笔","散文","emo文案","伤感文案","搞笑文案","书","看书","读书笔记","推荐书"],
  city: ["城市","生活","本地","租房","通勤","菜市场","小城","县城","社区","日常","家居","收纳","独居","搬家","外卖","超市","老破小","合租","买房","装修","断舍离","极简","出租屋","烟火气","职场","实习","求职","秋招","春招","产品","大厂","领导","汇报","人脉","入职","牛马","打工人","采购","转正","晋升","上班","下班","工位","会议","周报","摸鱼","加班","简历","offer","面试","相亲","婚礼","备婚","约会","dating","暧昧","恋爱","礼物","送礼","感谢","同事","老板","沟通","情商","广州","北京","上海","深圳","杭州","成都","穿搭","跳槽","离职","愧疚","新人","mentor","pm","产品经理","社恐","朋友","闺蜜","兄弟","室友","工作能力","能力强","去留","找工作","管理岗","管理层","老师","教师","项目经理","职业生涯","师兄","广东","蟑螂","发霉","洗衣","异味","工作状态","发展","上下级","嘴硬","工作经验","办公"],
  food: ["美食","料理","菜","食谱","厨房","晚餐","早餐","烘焙","探店","咖啡","减脂餐","快手菜","川菜","甜品","奶茶","减脂","吃法","教程","便当","汤","面","饭","好吃","餐厅","小吃","夜宵","牛肉","牛腱","烤肉","海鲜","自助","卤","鸡","肉","厨艺","备餐","盒马","一人食","食材","做法","火锅","烧烤","麻辣","螺蛳粉","代餐","早茶","下午茶","饮品","果汁","沙拉","轻食","低卡","零食","挑食"],
};
const XHS_KEY_PRIORITY = ["ai", "finance", "food", "travel", "baby", "film", "exam", "growth", "social", "city"];

function xhsAutoClassify(title) {
  const t = String(title || "").toLowerCase();
  if (!t.trim()) return null;
  let best = null, bestScore = 0;
  for (const id of XHS_KEY_PRIORITY) {
    const kws = XHS_KEYWORDS[id] || [];
    let score = 0;
    const seen = new Set();
    for (const kw of kws) {
      if (seen.has(kw)) continue;
      seen.add(kw);
      if (t.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) { bestScore = score; best = id; }
  }
  return bestScore > 0 ? best : null;
}
// 把 CSV 里的分类字符串解析成稳定 id：已知 id / 已知名称 → 复用；自定义名称 → 新建分类；空 → 关键词自动归类
function xhsResolveCat(raw, title) {
  raw = String(raw || "").trim();
  if (!raw || raw === "default" || raw === "默认") return xhsAutoClassify(title) || "default";
  if (D.xhsCats.find((c) => c.id === raw)) return raw;
  const byName = D.xhsCats.find((c) => c.name === raw);
  if (byName) return byName.id;
  const id = "c-" + uid().slice(0, 6);
  D.xhsCats.push({ id, name: raw });
  return id;
}

/* ---------- 仅 UI 状态（不入同步） ---------- */
let xhsCat = "all";      // all | 分类 id
let xhsQ = "";
let xhsTag = null;
let xhsSort = "likes";   // likes | recent | title
let xhsEditId = null;
let xhsBound = false;
let xhsMulti = false;
let xhsPage = 1;         // 列表分页（仅 UI）
const XHS_PAGE_SIZE = 40;
const xhsSelected = new Set();

/* ---------- 数据存取 ---------- */
function xhsEnsure() {
  if (!Array.isArray(D.xhsNotes)) D.xhsNotes = [];
  if (!Array.isArray(D.xhsCats)) D.xhsCats = [];
}
function xhsCatName(id) {
  if (id === "all") return "全部";
  if (id === "default") return "默认";
  const c = D.xhsCats.find((c) => c.id === id);
  return c ? c.name : id;
}
function xhsSeedIfEmpty() {
  xhsEnsure();
  // 示例数据只播种一次（持久标记，随云同步走）。否则"全选删光"会立刻触发重新播种，
  // 31 条示例以新 id 复活，看起来像"删除被云同步撤销"（2026-10-05 修复）。
  if (D.settings.xhsSeeded) return;
  // 老用户已有数据但尚无标记：补标记即可，不再播种
  if (D.xhsNotes.length || D.xhsCats.length) { D.settings.xhsSeeded = true; save(true); return; }
  if (!D.xhsCats.length && XHS_SEED.cats.length) {
    D.xhsCats = XHS_SEED.cats.map((c) => ({ id: c.id, name: c.name }));
  }
  if (!D.xhsNotes.length && XHS_SEED.notes.length) {
    const now = Date.now();
    D.xhsNotes = XHS_SEED.notes.map((n, i) => ({
      id: uid(),
      title: n.title || "",
      author: n.author || "",
      likes: Number(n.likes) || 0,
      cat: n.cat || "default",
      url: n.url || "",
      tags: n.tags || "",
      date: new Date(now - i * 86400000).toISOString().slice(0, 10),
      memo: n.memo || "",
      desc: "",
      created: now - i * 1000,
      updatedAt: now - i * 1000,
    }));
    D.settings.xhsSeeded = true;
    save(true);
  }
}

/* ---------- 过滤 / 排序 ---------- */
function xhsFiltered() {
  let list = D.xhsNotes.slice();
  if (xhsCat !== "all") list = list.filter((n) => (n.cat || "default") === xhsCat);
  const q = xhsQ.trim().toLowerCase();
  if (q) {
    list = list.filter((n) =>
      (n.title || "").toLowerCase().includes(q) ||
      (n.author || "").toLowerCase().includes(q) ||
      (n.tags || "").toLowerCase().includes(q) ||
      (n.memo || "").toLowerCase().includes(q) ||
      (n.desc || "").toLowerCase().includes(q));
  }
  if (xhsTag) {
    const t = xhsTag;
    list = list.filter((n) => (n.tags || "").split(/[,，;]/).map((s) => s.trim()).filter(Boolean).includes(t));
  }
  if (xhsSort === "likes") list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  else if (xhsSort === "recent") list.sort((a, b) => (b.updatedAt || b.created || 0) - (a.updatedAt || a.created || 0));
  else if (xhsSort === "title") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  return list;
}
// 全部笔记按当前排序（用于导出）
function xhsSortedAll() {
  const list = D.xhsNotes.slice();
  if (xhsSort === "likes") list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  else if (xhsSort === "recent") list.sort((a, b) => (b.updatedAt || b.created || 0) - (a.updatedAt || a.created || 0));
  else if (xhsSort === "title") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  return list;
}
function xhsAllTags() {
  const m = new Map();
  D.xhsNotes.forEach((n) => {
    (n.tags || "").split(/[,，;]/).map((s) => s.trim()).filter(Boolean)
      .forEach((t) => m.set(t, (m.get(t) || 0) + 1));
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
function xhsCatCount(id) {
  if (id === "all") return D.xhsNotes.length;
  return D.xhsNotes.filter((n) => (n.cat || "default") === id).length;
}
function xhsRecentList(n) {
  return (D.xhsNotes || []).slice()
    .sort((a, b) => (b.updatedAt || b.created || 0) - (a.updatedAt || a.created || 0))
    .slice(0, n);
}

/* ---------- 卡片 ---------- */
function xhsLikeFmt(n) {
  const v = n.likes || 0;
  return v >= 10000 ? (v / 10000).toFixed(1) + "w" : String(v);
}
function xhsCardHtml(n) {
  const tags = (n.tags || "").split(/[,，;]/).map((s) => s.trim()).filter(Boolean);
  const note = n.memo || n.desc || "";
  const sel = xhsSelected.has(n.id);
  const topRight = xhsMulti
    ? `<input type="checkbox" class="xhs-sel" data-sel="${esc(n.id)}" ${sel ? "checked" : ""} title="选择">`
    : `<button class="icon-btn" data-del="${esc(n.id)}" title="删除">✕</button>`;
  return `<div class="xhs-card${xhsMulti ? " multi" : ""}${sel ? " selected" : ""}" data-id="${esc(n.id)}"${xhsMulti ? ' draggable="true"' : ""}>
    <div class="xhs-card-top">
      <span class="xhs-cat">${esc(xhsCatName(n.cat))}</span>
      ${topRight}
    </div>
    <a class="xhs-title" href="${esc(safeUrl(n.url))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(n.title)}</a>
    <div class="xhs-meta"><span>${esc(n.author || "匿名")}</span>${n.date ? `<span class="xhs-date">📅 ${esc(n.date)}</span>` : ""}<span class="xhs-like">❤ ${xhsLikeFmt(n)}</span></div>
    ${note ? `<p class="xhs-note">${esc(note)}</p>` : ""}
    ${tags.length ? `<div class="xhs-tags-in">${tags.map((t) => `<span class="tag" data-tag="${esc(t)}">${esc(t)}</span>`).join("")}</div>` : ""}
    ${xhsMulti ? "" : `<button class="btn ghost sm xhs-edit" data-pick="${esc(n.id)}">编辑</button>`}
  </div>`;
}

/* ---------- 渲染（壳只建一次，结果区增量更新，避免搜索框失焦） ---------- */
function buildXhsShell(root) {
  root.innerHTML = `
    <div class="xhs-tool">
      <input id="xhs-search" class="inp" placeholder="搜索标题 / 作者 / 标签 / 批注…">
      <select id="xhs-sort" class="inp" style="width:auto">
        <option value="likes">按点赞</option>
        <option value="recent">按最近</option>
        <option value="title">按标题</option>
      </select>
      <button class="btn" onclick="openXhsEditor()">＋ 新增笔记</button>
      <button class="btn ghost" onclick="xhsImportCsv()">⬆ 导入CSV</button>
      <button class="btn ghost" onclick="xhsOpenExport()">⬇ 导出</button>
      <button class="btn ghost" id="xhs-multi-btn" onclick="xhsToggleMulti()">☑ 多选</button>
    </div>
    <div class="xhs-bulkbar" id="xhs-bulkbar" hidden>
      <label class="xhs-selall"><input type="checkbox" id="xhs-selall"> 全选</label>
      <button class="btn sm ghost" onclick="xhsInvert()">反选</button>
      <select id="xhs-bulk-cat" class="inp" style="width:auto"></select>
      <button class="btn sm" id="xhs-bulk-move" onclick="xhsBulkMove()">移动到分类</button>
      <button class="btn sm ghost" onclick="xhsToggleTagPanel()">打标签</button>
      <button class="btn sm ghost" onclick="xhsToggleAuthorPanel()">改作者</button>
      <button class="btn sm ghost" id="xhs-bulk-export" onclick="xhsExportSelected()">导出选中CSV</button>
      <button class="btn sm danger" id="xhs-bulk-del" onclick="xhsBulkDelete()">删除选中</button>
      <button class="btn sm gray" onclick="xhsToggleMulti()">退出多选</button>
      <span class="muted" id="xhs-selcount">0 选中</span>
    </div>
    <div class="xhs-cats"></div>
    <div class="xhs-tags"></div>
    <div class="xhs-grid"></div>`;
  $("#xhs-search").addEventListener("input", (e) => { xhsQ = e.target.value; xhsPage = 1; xhsDebouncedRender(); });
  $("#xhs-sort").addEventListener("change", (e) => { xhsSort = e.target.value; xhsPage = 1; xhsRenderResults(); });
  $("#xhs-selall").addEventListener("change", (e) => { e.target.checked ? xhsSelectAll() : xhsClearSel(); });
  $(".xhs-cats").addEventListener("click", (e) => {
    const clr = e.target.closest("[data-clear]");
    if (clr) { e.stopPropagation(); xhsClearCat(clr.dataset.clear); return; }
    const b = e.target.closest("[data-cat]"); if (!b) return;
    if (xhsMulti && xhsSelected.size > 0) { xhsBulkMoveTo(b.dataset.cat); return; }
    xhsCat = b.dataset.cat; xhsTag = null; xhsPage = 1; xhsRenderResults();
  });
  $(".xhs-cats").addEventListener("dragover", (e) => {
    if (!xhsMulti || xhsSelected.size === 0) return;
    const pill = e.target.closest("[data-cat]"); if (pill) { e.preventDefault(); pill.classList.add("drag-over"); }
  });
  $(".xhs-cats").addEventListener("dragleave", (e) => {
    const pill = e.target.closest("[data-cat]"); if (pill) pill.classList.remove("drag-over");
  });
  $(".xhs-cats").addEventListener("drop", (e) => {
    if (!xhsMulti || xhsSelected.size === 0) return;
    const pill = e.target.closest("[data-cat]"); if (!pill) return;
    e.preventDefault(); pill.classList.remove("drag-over"); xhsBulkMoveTo(pill.dataset.cat);
  });
  $(".xhs-tags").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tag]"); if (b) { xhsTag = b.dataset.tag; xhsPage = 1; xhsRenderResults(); return; }
    if (e.target.closest("#xhs-clear-tag")) { xhsTag = null; xhsPage = 1; xhsRenderResults(); }
  });
  const grid = $(".xhs-grid");
  grid.addEventListener("click", xhsGridClick);
  grid.addEventListener("dragstart", (e) => {
    if (!xhsMulti || xhsSelected.size === 0) { e.preventDefault(); return; }
    const card = e.target.closest(".xhs-card"); if (!card) { e.preventDefault(); return; }
    try { e.dataTransfer.setData("text/plain", "xhs-bulk-move"); } catch (_) {}
  });
}
function xhsGridClick(e) {
  const cb = e.target.closest("[data-sel]");
  if (cb) { e.stopPropagation(); xhsTogglePick(cb.dataset.sel); return; }
  const tg = e.target.closest("[data-tag]");
  if (tg) { e.preventDefault(); xhsTag = tg.dataset.tag; xhsRenderResults(); return; }
  if (!xhsMulti) {
    const pick = e.target.closest("[data-pick]"); if (pick) { openXhsEditor(pick.dataset.pick); return; }
    const del = e.target.closest("[data-del]"); if (del) { e.stopPropagation(); delXhsNote(del.dataset.del); return; }
    return;
  }
  // 多选模式：点卡片切换选中（点标题链接仍打开原文）
  const card = e.target.closest(".xhs-card");
  if (card && !e.target.closest(".xhs-title")) xhsTogglePick(card.dataset.id);
}
function xhsRenderResults() {
  const cats = [{ id: "all", name: "全部" }].concat(D.xhsCats);
  const tags = xhsAllTags().slice(0, 40);
  const list = xhsFiltered();
  const catsEl = $(".xhs-cats");
  if (catsEl) catsEl.innerHTML = cats.map((c) =>
    `<button class="pill ${xhsCat === c.id ? "active" : ""}" data-cat="${esc(c.id)}">${esc(c.name)} <span class="muted">${xhsCatCount(c.id)}</span>${c.id !== "all" ? `<button class="xhs-clear" data-clear="${esc(c.id)}" title="清空该分类">清空</button>` : ""}</button>`).join("");
  const tagsEl = $(".xhs-tags");
  if (tagsEl) tagsEl.innerHTML = tags.length
    ? `<span class="muted">标签：</span>` + tags.map(([t, c]) =>
        `<button class="tag-chip ${xhsTag === t ? "active" : ""}" data-tag="${esc(t)}">${esc(t)} <span class="c">${c}</span></button>`).join("")
        + (xhsTag ? `<button class="btn ghost sm" id="xhs-clear-tag">清除标签</button>` : "")
    : "";
  const gridEl = $(".xhs-grid");
  if (gridEl) {
    const pageList = list.slice(0, xhsPage * XHS_PAGE_SIZE);
    if (!pageList.length) {
      gridEl.innerHTML = `<div class="empty">没有匹配的笔记${ (xhsCat !== "all" || xhsQ || xhsTag) ? "，换个筛选试试" : "，点「＋ 新增笔记」开始收集" }</div>`;
    } else {
      gridEl.innerHTML = pageList.map(xhsCardHtml).join("");
      if (list.length > pageList.length) {
        gridEl.innerHTML += `<button class="btn ghost xhs-loadmore" onclick="xhsLoadMore()">加载更多（还剩 ${list.length - pageList.length} 条）</button>`;
      }
    }
  }
  const s = $("#xhs-search"); if (s && s.value !== xhsQ) s.value = xhsQ;
  const sort = $("#xhs-sort"); if (sort && sort.value !== xhsSort) sort.value = xhsSort;
  const mb = $("#xhs-multi-btn"); if (mb) mb.classList.toggle("active", xhsMulti);
  xhsRenderBulk();
}
function xhsRenderBulk() {
  const bar = $("#xhs-bulkbar"); if (!bar) return;
  bar.hidden = !xhsMulti;
  if (!xhsMulti) return;
  const list = xhsFiltered();
  const keys = list.map((n) => n.id);
  const allSel = keys.length > 0 && keys.every((k) => xhsSelected.has(k));
  const someSel = keys.some((k) => xhsSelected.has(k));
  const sa = $("#xhs-selall"); if (sa) { sa.checked = allSel; sa.indeterminate = !allSel && someSel; }
  const cnt = $("#xhs-selcount"); if (cnt) cnt.textContent = xhsSelected.size + " 选中";
  const have = xhsSelected.size > 0;
  ["#xhs-bulk-move", "#xhs-bulk-del", "#xhs-bulk-export"].forEach((s) => { const b = $(s); if (b) b.disabled = !have; });
  const selCat = $("#xhs-bulk-cat");
  if (selCat) {
    if (selCat._len !== D.xhsCats.length) {
      const cur = selCat.value;
      selCat.innerHTML = D.xhsCats.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
      if ([...selCat.options].some((o) => o.value === cur)) selCat.value = cur;
      selCat._len = D.xhsCats.length;
    }
  }
}
function renderXhs() {
  xhsSeedIfEmpty();
  xhsPage = 1;
  const root = $("#sec-xhs");
  if (!root) return;
  if (!xhsBound) { buildXhsShell(root); xhsBound = true; }
  xhsRenderResults();
}
// 搜索输入防抖（避免逐字重渲染）：180ms 后才重绘结果
let _xhsDeb;
function xhsDebouncedRender() { clearTimeout(_xhsDeb); _xhsDeb = setTimeout(() => xhsRenderResults(), 180); }
function xhsLoadMore() { xhsPage++; xhsRenderResults(); }

/* ---------- 多选 / 批量 ---------- */
function xhsToggleMulti() {
  xhsMulti = !xhsMulti;
  if (!xhsMulti) xhsSelected.clear();
  xhsRenderResults();
}
function xhsTogglePick(id) {
  if (!id) return;
  if (xhsSelected.has(id)) xhsSelected.delete(id); else xhsSelected.add(id);
  xhsRenderResults();
}
function xhsSelectAll() {
  xhsFiltered().forEach((n) => xhsSelected.add(n.id));
  xhsRenderResults();
}
function xhsClearSel() { xhsSelected.clear(); xhsRenderResults(); }
function xhsInvert() {
  const list = xhsFiltered();
  if (!list.length) return toast("当前没有可操作的笔记");
  list.forEach((n) => { if (xhsSelected.has(n.id)) xhsSelected.delete(n.id); else xhsSelected.add(n.id); });
  xhsRenderResults();
  toast("已反选（共 " + xhsSelected.size + " 项）");
}
function xhsBulkMoveTo(catId) {
  if (!catId) return;
  let n = 0;
  D.xhsNotes.forEach((nt) => { if (xhsSelected.has(nt.id)) { nt.cat = catId; nt.updatedAt = Date.now(); n++; } });
  xhsSelected.clear(); save(); renderXhs();
  toast(`已将 ${n} 条移动到「${xhsCatName(catId)}」`);
}
function xhsBulkMove() {
  if (!xhsSelected.size) return toast("请先选择笔记");
  const v = $("#xhs-bulk-cat"); if (!v || !v.value) return toast("请选择目标分类");
  xhsBulkMoveTo(v.value);
}
function xhsBulkDelete() {
  if (!xhsSelected.size) return toast("请先选择笔记");
  appConfirm(`确定删除选中的 ${xhsSelected.size} 条笔记？同步的其他端也会删除。`, () => {
    xhsSelected.forEach((id) => tombstone(id));
    D.xhsNotes = D.xhsNotes.filter((n) => !xhsSelected.has(n.id));
    xhsSelected.clear(); save(); renderXhs(); toast("已删除选中笔记");
  }, { danger: true });
}
function xhsClearCat(id) {
  const cnt = D.xhsNotes.filter((n) => (n.cat || "default") === id).length;
  if (!cnt) return toast("该分类暂无笔记");
  appConfirm(`确定清空「${xhsCatName(id)}」分类下的 ${cnt} 条笔记？此操作不可撤销。`, () => {
    D.xhsNotes.filter((n) => (n.cat || "default") === id).forEach((n) => tombstone(n.id));
    D.xhsNotes = D.xhsNotes.filter((n) => (n.cat || "default") !== id);
    save(); renderXhs(); toast(`已清空「${xhsCatName(id)}」`);
  }, { danger: true });
}
function xhsToggleTagPanel() {
  if (!xhsSelected.size) return toast("请先选择笔记，或在下方按关键词筛选");
  openModal(`<h3>批量打标签</h3>
    <p class="muted">可先按关键词从当前视图筛选加入选择，再给所选笔记追加标签（自动去重）。</p>
    <div class="form-row"><input id="xhs-tag-kw" class="inp" placeholder="可选：关键词（标题/作者/标签命中即加入选择）"></div>
    <div class="form-row"><input id="xhs-tag-input" class="inp" placeholder="要打的标签，逗号分隔，如：GPT,提示词"></div>
    <div class="muted" id="xhs-tag-hint"></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn" onclick="xhsApplyTag()">应用</button>
      <button class="btn gray" onclick="closeModal()">取消</button>
    </div>`);
  setTimeout(() => { const k = $("#xhs-tag-kw"); if (k) k.focus(); }, 30);
}
function xhsApplyTag() {
  const kw = $("#xhs-tag-kw").value.trim();
  const tagRaw = $("#xhs-tag-input").value.trim();
  if (!tagRaw) return ($("#xhs-tag-hint").textContent = "请填写要打的标签");
  if (kw) {
    const q = kw.toLowerCase();
    let added = 0;
    xhsFiltered().forEach((n) => {
      const hay = ((n.title || "") + " " + (n.author || "") + " " + (n.tags || "")).toLowerCase();
      if (hay.includes(q) && !xhsSelected.has(n.id)) { xhsSelected.add(n.id); added++; }
    });
    $("#xhs-tag-hint").textContent = `按「${kw}」新增选中 ${added} 条`;
  }
  if (!xhsSelected.size) return ($("#xhs-tag-hint").textContent = "请先选择笔记，或填写关键词筛选");
  const newTags = tagRaw.split(/[,，;]/).map((s) => s.trim()).filter(Boolean);
  let cnt = 0;
  D.xhsNotes.forEach((n) => {
    if (!xhsSelected.has(n.id)) return;
    const existing = (n.tags || "").split(/[,，;]/).map((s) => s.trim()).filter(Boolean);
    let changed = false;
    for (const t of newTags) {
      if (!existing.some((e) => e.toLowerCase() === t.toLowerCase())) { existing.push(t); changed = true; }
    }
    if (changed) { n.tags = existing.join(", "); n.updatedAt = Date.now(); cnt++; }
  });
  xhsSelected.clear(); save(); closeModal(); renderXhs();
  toast(`已为 ${cnt} 条笔记打标签「${newTags.join(", ")}」✓`);
}
function xhsToggleAuthorPanel() {
  if (!xhsSelected.size) return toast("请先选择笔记");
  openModal(`<h3>批量修改作者</h3>
    <p class="muted">把所选笔记的作者统一改为填写的名字。</p>
    <div class="form-row"><input id="xhs-author-input" class="inp" placeholder="作者名"></div>
    <div class="muted" id="xhs-author-hint"></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn" onclick="xhsApplyAuthor()">应用</button>
      <button class="btn gray" onclick="closeModal()">取消</button>
    </div>`);
  setTimeout(() => { const k = $("#xhs-author-input"); if (k) k.focus(); }, 30);
}
function xhsApplyAuthor() {
  const name = $("#xhs-author-input").value.trim();
  if (!name) return ($("#xhs-author-hint").textContent = "请填写作者名");
  if (!xhsSelected.size) return ($("#xhs-author-hint").textContent = "请先选择笔记");
  let cnt = 0;
  D.xhsNotes.forEach((n) => {
    if (xhsSelected.has(n.id)) { n.author = name; n.updatedAt = Date.now(); cnt++; }
  });
  xhsSelected.clear(); save(); closeModal(); renderXhs();
  toast(`已将 ${cnt} 条笔记作者改为「${name}」✓`);
}

/* ---------- 编辑 / 新增 / 删除 ---------- */
function openXhsEditor(id) {
  xhsEditId = id || null;
  const n = id ? D.xhsNotes.find((x) => x.id === id) : null;
  const catOpts = D.xhsCats.map((c) => `<option value="${esc(c.id)}"${n && n.cat === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("");
  openModal(`<h3>${n ? "编辑笔记" : "新增笔记"}</h3>
    <div class="form-row"><input id="xhs-f-title" class="inp" placeholder="标题" value="${esc(n ? n.title : "")}"></div>
    <div class="grid cols-2">
      <input id="xhs-f-author" class="inp" placeholder="作者" value="${esc(n ? n.author : "")}">
      <input id="xhs-f-likes" class="inp" type="number" placeholder="点赞数" value="${n ? n.likes : ""}">
    </div>
    <div class="form-row"><select id="xhs-f-cat" class="inp">${catOpts}</select></div>
    <div class="form-row"><input id="xhs-f-url" class="inp" placeholder="原帖链接" value="${esc(n ? n.url : "")}"></div>
    <div class="form-row"><input id="xhs-f-tags" class="inp" placeholder="标签，逗号分隔，如：GPT,提示词" value="${esc(n ? n.tags : "")}"></div>
    <div class="form-row"><textarea id="xhs-f-memo" class="inp" rows="3" placeholder="批注 / 你的笔记（可被搜索与导出）">${esc(n ? n.memo : "")}</textarea></div>
    <div class="form-row"><textarea id="xhs-f-desc" class="inp" rows="2" placeholder="摘要">${esc(n ? n.desc : "")}</textarea></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn" onclick="saveXhsNote()">保存</button>
      <button class="btn gray" onclick="closeModal()">取消</button>
    </div>`);
}
function saveXhsNote() {
  const title = $("#xhs-f-title").value.trim();
  if (!title) return toast("请填写标题");
  const now = Date.now();
  const data = {
    title,
    author: $("#xhs-f-author").value.trim(),
    likes: Number($("#xhs-f-likes").value) || 0,
    cat: $("#xhs-f-cat").value || "default",
    url: $("#xhs-f-url").value.trim(),
    tags: $("#xhs-f-tags").value.trim(),
    memo: $("#xhs-f-memo").value.trim(),
    desc: $("#xhs-f-desc").value.trim(),
    updatedAt: now,
  };
  if (xhsEditId) {
    const n = D.xhsNotes.find((x) => x.id === xhsEditId);
    if (!n) return closeModal();
    Object.assign(n, data);
  } else {
    D.xhsNotes.push(Object.assign({ id: uid(), created: now, date: "" }, data));
  }
  save(); closeModal(); renderXhs(); toast(xhsEditId ? "已更新" : "已添加");
}
function delXhsNote(id) {
  const n = D.xhsNotes.find((x) => x.id === id); if (!n) return;
  appConfirm("确定删除这条笔记？同步的其他端也会删除。", () => {
    tombstone(id);
    D.xhsNotes = D.xhsNotes.filter((x) => x.id !== id);
    xhsSelected.delete(id);
    save(); renderXhs(); toast("已删除");
  }, { danger: true });
}

/* ---------- CSV 导入 ---------- */
function xhsImportCsv() {
  openModal(`<h3>⬆ 导入 CSV</h3>
    <p class="muted">粘贴 CSV 或直接从 Excel/WPS 复制粘贴均可（支持英文/中文表头、Tab 分隔、无表头自动识别）。无分类的行按标题关键词自动归类，归不到的进「默认」。</p>
    <textarea id="xhs-csv" class="inp" rows="8" placeholder="支持三种方式：① 粘贴标准 CSV（表头 title,author,likes,category,url,tags,date,memo,desc）② 直接从 Excel/WPS 里 Ctrl+A 复制粘贴（中文表头、Tab 分隔均可）③ 无表头时自动按内容识别链接/点赞/标题列"></textarea>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn" onclick="xhsDoImport()">导入</button>
      <button class="btn gray" onclick="closeModal()">取消</button>
    </div>`);
}
function xhsParseCsv(text) {
  text = String(text || "").replace(/^\uFEFF/, "");
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return [];
  // 分隔符自动识别：首行含 Tab（从 Excel 复制粘贴）用 Tab，否则用逗号
  const delim = lines[0].indexOf("\t") >= 0 ? "\t" : ",";
  const splitLine = (line) => {
    const out = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else { if (ch === delim) { out.push(cur); cur = ""; } else if (ch === '"') q = true; else cur += ch; }
    }
    out.push(cur); return out;
  };
  const rows = lines.map(splitLine);
  // 表头别名：兼容中文表头（抓取工具 / Excel 常见列名）
  const ALIAS = {
    "标题": "title", "题目": "title", "名称": "title", "笔记标题": "title",
    "作者": "author", "博主": "author", "昵称": "author", "用户名": "author",
    "点赞": "likes", "点赞数": "likes", "赞": "likes", "热度": "likes",
    "分类": "category", "类别": "category",
    "链接": "url", "地址": "url", "网址": "url",
    "标签": "tags",
    "日期": "date", "时间": "date", "发布时间": "date", "收藏时间": "date",
    "备注": "memo", "批注": "memo", "笔记": "memo", "说明": "memo",
    "描述": "desc", "摘要": "desc", "简介": "desc", "内容": "desc",
  };
  const norm = (h) => { const k = String(h || "").trim().toLowerCase(); return ALIAS[k] || k; };
  let start = 1;
  let head = rows[0].map(norm);
  const hasHead = head.includes("title") || head.includes("author");
  let noHead = false;
  if (!hasHead) { noHead = true; start = 0; head = []; }
  const idx = (...names) => { for (const nm of names) { const i = head.indexOf(nm); if (i >= 0) return i; } return -1; };
  const iTitle = idx("title"), iAuthor = idx("author"), iLikes = idx("likes"),
    iCat = idx("category", "cat"), iUrl = idx("url", "link"), iTags = idx("tags"),
    iDate = idx("date"), iMemo = idx("memo", "批注", "笔记"), iDesc = idx("desc", "摘要"), iId = idx("id");
  const parseLikes = (s) => {
    s = String(s || "").trim().replace(/[,+\s]/g, "");
    let m = s.match(/^([\d.]+)万$/); if (m) return Math.round(parseFloat(m[1]) * 10000);
    m = s.match(/^([\d.]+)w$/i); if (m) return Math.round(parseFloat(m[1]) * 10000);
    const n = Number(s); return isFinite(n) ? Math.round(n) : 0;
  };
  // 无表头模式：按单元格内容特征猜列（URL 列、纯数字列、首个文本列）
  const guessRow = (c) => {
    const cells = c.map((x) => String(x || "").trim());
    const used = new Set();
    let gUrl = "", gLikes = 0, gTitle = "", gAuthor = "", gDate = "";
    cells.forEach((x, i) => {
      if (!x || used.has(i)) return;
      if (!gUrl && /^https?:\/\//i.test(x)) { gUrl = x; used.add(i); return; }
      if (!gDate && /^\d{4}[-/.年]\d{1,2}[-/.月]/.test(x)) { gDate = x; used.add(i); return; }
      if (!gLikes && /^[\d,.]+[万w]?$/i.test(x) && parseLikes(x) > 0) { gLikes = parseLikes(x); used.add(i); return; }
    });
    for (let i = 0; i < cells.length; i++) {
      if (used.has(i) || !cells[i]) continue;
      if (!gTitle) { gTitle = cells[i]; used.add(i); continue; }
      if (!gAuthor && cells[i].length <= 30) { gAuthor = cells[i]; used.add(i); }
      break;
    }
    return { title: gTitle, author: gAuthor, likes: gLikes, url: gUrl, date: gDate, cat: "", tags: "", memo: "", desc: "" };
  };
  const now = Date.now();
  const out = [];
  for (let r = start; r < rows.length; r++) {
    const c = rows[r];
    let f = {};
    if (noHead) {
      f = guessRow(c);
    } else {
      const title = (iTitle >= 0 ? c[iTitle] : "") || "";
      if (!title.trim()) continue;
      const rawCat = iCat >= 0 ? (c[iCat] || "").trim() : "";
      const csvId = (iId >= 0 && c[iId] && String(c[iId]).trim()) ? String(c[iId]).trim() : "";
      f = {
        id: csvId || "",
        title: title.trim(),
        author: iAuthor >= 0 ? (c[iAuthor] || "").trim() : "",
        likes: parseLikes(iLikes >= 0 ? c[iLikes] : ""),
        cat: rawCat,
        url: iUrl >= 0 ? (c[iUrl] || "").trim() : "",
        tags: iTags >= 0 ? (c[iTags] || "").trim() : "",
        date: iDate >= 0 ? (c[iDate] || "").trim() : "",
        memo: iMemo >= 0 ? (c[iMemo] || "").trim() : "",
        desc: iDesc >= 0 ? (c[iDesc] || "").trim() : "",
      };
    }
    if (!f.title || !String(f.title).trim()) continue;
    out.push({
      id: f.id || uid(),
      title: String(f.title).trim(),
      author: f.author || "",
      likes: f.likes || 0,
      cat: xhsResolveCat(String(f.cat || "").trim(), String(f.title).trim()),
      url: f.url || "",
      tags: f.tags || "",
      date: f.date || "",
      memo: f.memo || "",
      desc: f.desc || "",
      created: now, updatedAt: now,
    });
  }
  return out;
}
function xhsDoImport() {
  const rows = xhsParseCsv($("#xhs-csv").value);
  if (!rows.length) return toast("没有解析到有效行（需含 title）");
  let added = 0, updated = 0;
  rows.forEach((r) => {
    const dup = (r.id && D.xhsNotes.find((n) => n.id === r.id)) || D.xhsNotes.find((n) => (n.title || "").toLowerCase() === r.title.toLowerCase());
    if (dup) { Object.assign(dup, r, { id: dup.id, updatedAt: Date.now() }); updated++; }
    else { D.xhsNotes.push(r); added++; }
  });
  save(); closeModal(); renderXhs();
  toast(`导入完成：新增 ${added}，更新 ${updated}`);
}

/* ---------- 导出：CSV / Markdown / Hugo（内容导出，非备份） ---------- */
function xhsOpenExport() {
  openModal(`<h3>⬇ 导出知识库</h3>
    <p class="muted">这是内容格式导出（可再导入 / 发布到博客）。<b>数据备份请到「设置 → 数据备份」</b>，那里会一并备份本模块。</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
      <button class="btn" onclick="xhsExportCsvAll()">CSV（字段与导入一致，可再导入）</button>
      <button class="btn" onclick="xhsExportMarkdown()">Markdown 文档（按分类分组）</button>
      <button class="btn" onclick="xhsExportHugo()">Hugo 文档（带 +++ front matter）</button>
      <button class="btn gray" onclick="closeModal()">取消</button>
    </div>`);
}
function xhsBuildCSV(notes) {
  const enc = (s) => { s = String(s ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ["title", "author", "likes", "category", "url", "tags", "date", "memo", "desc"];
  const lines = [head.join(",")];
  for (const n of notes) {
    lines.push([
      enc(n.title), enc(n.author), (n.likes || 0), enc(xhsCatName(n.cat)),
      enc(n.url), enc(n.tags), enc(n.date), enc(n.memo), enc(n.desc),
    ].join(","));
  }
  return "﻿" + lines.join("\n");
}
function xhsExportCsvAll() {
  const csv = xhsBuildCSV(xhsSortedAll());
  downloadFile("xhs-知识库-" + todayStr() + ".csv", csv, "text/csv;charset=utf-8");
  closeModal(); toast("已导出全部笔记 CSV ✓");
}
function xhsExportSelected() {
  if (!xhsSelected.size) return toast("请先选择笔记");
  const list = xhsSortedAll().filter((n) => xhsSelected.has(n.id));
  const csv = xhsBuildCSV(list);
  downloadFile("xhs-选中-" + todayStr() + ".csv", csv, "text/csv;charset=utf-8");
  closeModal(); toast(`已导出选中 ${list.length} 条 CSV ✓`);
}
function xhsMdNote(n) {
  const title = (n.title || "未命名笔记").replace(/[[\]]/g, "");
  const url = safeUrl(n.url) || "#";
  const lines = ["### " + title, ""];
  if (n.author && n.author !== "匿名") lines.push("- 作者：" + n.author);
  if (n.likes) lines.push("- 点赞：" + xhsLikeFmt(n));
  if (n.tags) lines.push("- 标签：" + n.tags);
  if (n.date) lines.push("- 收藏：" + n.date);
  if (n.memo) lines.push("", "> " + n.memo.split("\n").join("\n> "));
  if (n.desc) lines.push("- 摘要：" + n.desc);
  lines.push("- 链接：" + url, "");
  return lines.join("\n");
}
function xhsGroupByCat(notes) {
  const out = {};
  for (const n of notes) { const cid = n.cat || "default"; (out[cid] = out[cid] || []).push(n); }
  return out;
}
function xhsBuildMarkdown(notes) {
  const byCat = xhsGroupByCat(notes);
  const out = ["# 我的小红书知识库", "", "> 导出时间：" + new Date().toLocaleString("zh-CN"), ""];
  for (const c of D.xhsCats) {
    if (c.id === "all" || c.id === "default") continue;
    const list = byCat[c.id] || [];
    if (!list.length) continue;
    out.push("## " + c.name, "", ...list.map(xhsMdNote), "");
  }
  const def = byCat["default"] || [];
  if (def.length) out.push("## 默认（未分类）", "", ...def.map(xhsMdNote), "");
  return out.join("\n");
}
function xhsHugoNote(n, catName) {
  const e = (s) => String(s ?? "").replace(/"/g, '\\"');
  const title = e(n.title || "未命名笔记");
  const author = e(n.author || "匿名");
  const tags = (n.tags || "").split(/[,，;]/).map((s) => s.trim()).filter(Boolean)
    .map((t) => '"' + e(t) + '"').join(", ");
  return [
    "+++",
    'title = "' + title + '"',
    'author = "' + author + '"',
    "likes = " + (n.likes || 0),
    'category = "' + e(catName) + '"',
    "tags = [" + tags + "]",
    'date = "' + e(n.date) + '"',
    'url = "' + e(n.url) + '"',
    "+++",
    "",
    (n.url ? "链接：[" + title + "](" + safeUrl(n.url) + ")" : "链接：" + title),
    "",
    (n.memo ? ["> " + n.memo.split("\n").join("\n> ")].join("\n") : ""),
  ].join("\n");
}
function xhsBuildHugo(notes) {
  const byCat = xhsGroupByCat(notes);
  const out = [
    "---",
    "导出时间：" + new Date().toLocaleString("zh-CN"),
    "说明：单文件版 Hugo 内容。每个分类是一个 section，每条笔记是一篇带 +++ TOML front matter 的页面。",
    "拆分方法：新建 content/<分类名>/<slug>.md，把对应笔记块粘进去即可由 Hugo 渲染。",
    "---",
    "",
  ];
  for (const c of D.xhsCats) {
    if (c.id === "all" || c.id === "default") continue;
    const list = byCat[c.id] || [];
    if (!list.length) continue;
    out.push("<!-- section: " + c.name + " -->", "", ...list.map((n) => xhsHugoNote(n, c.name)), "");
  }
  const def = byCat["default"] || [];
  if (def.length) out.push("<!-- section: 默认（未分类） -->", "", ...def.map((n) => xhsHugoNote(n, "默认")), "");
  return out.join("\n");
}
function xhsExportMarkdown() {
  const text = xhsBuildMarkdown(xhsSortedAll());
  downloadFile("xhs-知识库-" + todayStr() + ".md", text, "text/markdown;charset=utf-8");
  closeModal(); toast("已导出 Markdown 文档 ✓");
}
function xhsExportHugo() {
  const text = xhsBuildHugo(xhsSortedAll());
  downloadFile("xhs-知识库-hugo-" + todayStr() + ".md", text, "text/markdown;charset=utf-8");
  closeModal(); toast("已导出 Hugo 文档 ✓");
}
