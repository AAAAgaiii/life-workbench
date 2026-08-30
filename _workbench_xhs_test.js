const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');

process.on('uncaughtException', (e) => { console.log('UNCAUGHT:', e && e.message); process.exitCode = 1; });
process.on('unhandledRejection', (e) => { console.log('UNHANDLED REJECTION:', e && (e.message || e)); process.exitCode = 1; });

const html = fs.readFileSync('index.html', 'utf8').replace(/<script[^>]*><\/script>/g, '');
const vc = new VirtualConsole();
const jsdomErrors = [];
vc.on('jsdomError', (e) => jsdomErrors.push(e.message || String(e)));

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole: vc });
const { window } = dom;
const { document } = window;

// ---- 环境桩（jsdom 缺的浏览器 API）----
window.matchMedia = () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
window.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
window.scrollTo = () => {};
window.URL.createObjectURL = () => 'blob:stub';
window.URL.revokeObjectURL = () => {};
window.HTMLAnchorElement.prototype.click = function () {};
window.addEventListener('error', (e) => jsdomErrors.push('window.error: ' + (e.error && e.error.stack || e.message)));

function assert(c, m) { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('ok  :', m); }

const files = ['foods.js', 'recipes.js', 'travel.js', 'xhs.js', 'app.js'];
for (const f of files) {
  try {
    const s = document.createElement('script');
    s.textContent = fs.readFileSync(f, 'utf8');
    document.body.appendChild(s);
  } catch (e) { console.log('SCRIPT LOAD ERROR (' + f + '):', e.stack); process.exit(1); }
}

// 触发小红书库页面（点击侧栏导航按钮，等价于 onclick="go('xhs')"）
const navBtn = [...document.querySelectorAll('#nav .nav-item')].find((b) => (b.getAttribute('onclick') || '').includes("go('xhs')"));
assert(!!navBtn, '侧栏存在小红书库导航项');
if (navBtn) navBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

const grid = document.querySelector('#sec-xhs .xhs-grid');
const cards = () => document.querySelectorAll('#sec-xhs .xhs-card');
assert(!!grid, '知识库网格已渲染 (#sec-xhs .xhs-grid)');
assert(cards().length === 31, '示例数据播种 31 张卡 -> ' + cards().length);

const pills = document.querySelectorAll('#sec-xhs .xhs-cats .pill');
assert(pills.length === 12, '分类条含 全部 + 11 个分类 -> ' + pills.length);

assert(!!document.querySelector('#xhs-search'), '搜索框存在');
assert(!!document.querySelector('#xhs-sort'), '排序下拉存在');
assert(!!document.querySelector('#sec-xhs .xhs-tags'), '标签云容器存在');

// 按分类过滤
const aiPill = [...pills].find((p) => p.dataset.cat === 'ai');
aiPill.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(cards().length === 4, '点 AI工具 后网格=4 张 -> ' + cards().length);
const allPill = [...document.querySelectorAll('#sec-xhs .xhs-cats .pill')].find((p) => p.dataset.cat === 'all');
allPill.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(cards().length === 31, '切回全部后网格恢复 31 张 -> ' + cards().length);

// 搜索
const search = document.querySelector('#xhs-search');
search.value = 'GPT';
search.dispatchEvent(new window.Event('input', { bubbles: true }));
window.eval('xhsRenderResults()'); // 越过防抖直接重绘，便于断言
assert(cards().length === 1, '搜索 GPT 过滤为 1 张 -> ' + cards().length);
search.value = '';
search.dispatchEvent(new window.Event('input', { bubbles: true }));
window.eval('xhsRenderResults()');
assert(cards().length === 31, '清空搜索恢复 31 张 -> ' + cards().length);

// 标签过滤
const tagChip = document.querySelector('#sec-xhs .xhs-tags .tag-chip');
assert(!!tagChip, '标签云渲染出标签 chip');
if (tagChip) {
  const t = tagChip.dataset.tag;
  tagChip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const vis = cards().length;
  const ok = [...cards()].every((c) => [...c.querySelectorAll('.tag[data-tag]')].some((x) => x.dataset.tag === t));
  assert(vis > 0 && ok, `点标签「${t}」后仅显示相关笔记 (${vis} 张)`);
  const clearBtn = document.querySelector('#xhs-clear-tag');
  if (clearBtn) clearBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

// 解析器自检（导入逻辑核心）
let parsed = 0;
try { parsed = window.eval('xhsParseCsv("title,author,likes,category\\n测试笔记,张三,10,ai").length'); } catch (e) { jsdomErrors.push('xhsParseCsv: ' + e.message); }
assert(parsed === 1, 'CSV 解析器可解析单行 -> ' + parsed);

// 同步字段已并入（通过全局 eval 读取；若作用域不可见则跳过）
try {
  const inc = window.eval('(typeof SYNC_ARR_FIELDS!=="undefined" && SYNC_ARR_FIELDS.includes("xhsNotes") && SYNC_ARR_FIELDS.includes("xhsCats"))');
  assert(inc === true, 'SYNC_ARR_FIELDS 含 xhsNotes/xhsCats（并入统一同步）');
} catch (e) { console.log('skip: SYNC_ARR_FIELDS 作用域不可见（源码已确认）'); }

// ---- 新增功能自检 ----
window.confirm = () => true;

// 关键词自动归类（单一数据源）
const ac1 = window.eval('xhsResolveCat("", "如何用 GPT 写提示词提升效率")');
assert(ac1 === 'ai', '空分类 + GPT 关键词 -> 自动归 ai -> ' + ac1);
const ac2 = window.eval('xhsResolveCat("ABC专属收藏夹XYZ", "随便")');
assert(!!ac2 && ac2.indexOf('c-') === 0, '未知分类名 -> 新建自定义分类 -> ' + ac2);
const ac3 = window.eval('xhsResolveCat("finance", "x")');
assert(ac3 === 'finance', '已知分类 id 直接复用 -> ' + ac3);

// 捕获下载内容（覆盖 Blob，避免依赖 jsdom Blob.text）
const blobs = [];
const RealBlob = window.Blob;
window.Blob = function (parts, opts) { blobs.push({ text: parts.join(''), type: (opts && opts.type) || '' }); return new RealBlob(parts, opts); };

window.eval('xhsExportCsvAll()');
const csvBlob = blobs.find((b) => b.type.includes('csv'));
assert(csvBlob && /title,author,likes/.test(csvBlob.text), 'CSV 导出含表头 title,author,likes');
assert(csvBlob && csvBlob.text.split('\n').filter((l) => l.trim()).length >= 32, 'CSV 导出含 31 数据行 -> ' + (csvBlob ? csvBlob.text.split('\n').length : 0));

window.eval('xhsExportMarkdown()');
const mdBlob = blobs.find((b) => b.type.includes('markdown'));
assert(mdBlob && /# 我的小红书知识库/.test(mdBlob.text), 'Markdown 导出含文档标题');

window.eval('xhsExportHugo()');
const hugoBlob = blobs[blobs.length - 1];
assert(hugoBlob && /\+\+\+/.test(hugoBlob.text) && /title = /.test(hugoBlob.text), 'Hugo 导出含 +++ front matter');

// 多选 + 批量移动到分类
window.eval("xhsToggleMulti()");
const bulkbar = document.querySelector('#xhs-bulkbar');
assert(bulkbar && !bulkbar.hidden, '进入多选模式显示批量条');
const pickIds = [...cards()].slice(0, 3).map((c) => c.dataset.id);
pickIds.forEach((id) => {
  const el = document.querySelector('#sec-xhs .xhs-card[data-id="' + id + '"]');
  if (el) el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
});
const selCount = window.eval('xhsSelected.size');
assert(selCount === 3, '勾选 3 张卡 -> xhsSelected=' + selCount);
const before = window.eval("D.xhsNotes.filter(n=>(n.cat||'default')==='city').length");
window.eval("document.querySelector('#xhs-bulk-cat').value='city'; xhsBulkMove()");
const after = window.eval("D.xhsNotes.filter(n=>(n.cat||'default')==='city').length");
assert(after === before + 3, '批量移动 3 张到 city -> ' + before + '->' + after);
window.eval("xhsToggleMulti()");
assert(document.querySelector('#xhs-bulkbar').hidden, '退出多选隐藏批量条');

// 清空分类（侧栏「清空」按钮）
window.eval("D.xhsCats.push({id:'tmp-clear',name:'临时清空测试'}); D.xhsNotes.push({id:'tmp-n1',title:'临时笔记',cat:'tmp-clear',likes:0,tags:'',created:Date.now(),updatedAt:Date.now()}); renderXhs();");
const clrBtn = document.querySelector('#sec-xhs .xhs-cats .xhs-clear[data-clear="tmp-clear"]');
assert(!!clrBtn, '分类条含「清空」按钮');
if (clrBtn) clrBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const clrYes = document.getElementById('ac-yes');
if (clrYes) clrYes.click(); // appConfirm 弹窗：点「确定」执行删除
const tmpLeft = window.eval("D.xhsNotes.filter(n=>(n.cat||'default')==='tmp-clear').length");
assert(tmpLeft === 0, '清空分类后该分类笔记归零 -> ' + tmpLeft);

// 仪表盘「最近收藏的小红书」组件
window.eval("go('dashboard')");
const dash = document.querySelector('#sec-dashboard');
assert(dash && /最近收藏的小红书/.test(dash.innerHTML), '仪表盘含「最近收藏的小红书」组件');
const xhsItems = document.querySelectorAll('#sec-dashboard [data-dash="xhs"] .list-item');
assert(xhsItems.length > 0, '仪表盘组件列出最近收藏 (' + xhsItems.length + ')');

console.log('\njsdom 运行期错误：', jsdomErrors.length ? jsdomErrors : '无');
if (jsdomErrors.length) process.exitCode = 1;
console.log(process.exitCode ? '\n=== 存在失败/错误 ===' : '\n=== 全部通过 ===');

// 让未决的微任务/定时器 settle 后再干净退出（工作台 init 注册了 setInterval，避免悬挂）
setTimeout(() => process.exit(process.exitCode || 0), 60);
