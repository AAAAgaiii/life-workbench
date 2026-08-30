/* 构建 standalone.html：把 CSS 与 JS 内联为单文件离线版 */
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");

let html = read("index.html");
// 内联 CSS
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + read("style.css") + "\n</style>");
// 移除 manifest / apple-touch-icon（离线单文件不需要）
html = html.replace('<link rel="manifest" href="manifest.json">\n', "");
html = html.replace('<link rel="apple-touch-icon" href="icon-192.png">\n', "");
// 内联 JS
for (const f of ["foods.js", "recipes.js", "travel.js", "xhs.js", "app.js"]) {
  let js = read(f);
  if (f === "app.js") {
    // 离线版：不注册 Service Worker
    js = js.replace('navigator.serviceWorker.register("sw.js").catch(() => {});', "/* standalone: no sw */");
  }
  html = html.replace(`<script src="${f}"></script>`, "<script>\n" + js + "\n</script>");
}
// 内联健身系统（base64，去除失效背景媒体引用，使 standalone 成为真·单文件全功能）
try {
  let fit = read("fitness/fit/index.html");
  fit = fit.replace(/url\("工作台与工具[^"]*"\)/g, "none")
           .replace(/src="工作台与工具[^"]*"/g, "");
  const b64 = Buffer.from(fit, "utf8").toString("base64");
  // 必须匹配 index.html 真正的 </body>\n</html> 结尾；app.js 模板字符串里有 </body></html>（无换行），用带换行的模式避免注入到 JS 中间导致语法错误
  html = html.replace(/<\/body>\r?\n<\/html>/i, `<script>window.FITNESS_B64="${b64}";</script>\n</body>\n</html>`);
  console.log("fitness inlined, base64 len:", b64.length);
} catch (e) {
  console.log("fitness inline skipped:", e.message);
}
fs.writeFileSync(path.join(dir, "standalone.html"), html);
console.log("standalone.html built:", fs.statSync(path.join(dir, "standalone.html")).size, "bytes");
// 生成 version.json（供在线版 checkUpdate 检测更新）
const version = { builtAt: Date.now(), note: "便携单文件版 v1：健身系统已 base64 内联，standalone.html 真·单文件全功能、脱离网址即用" };
fs.writeFileSync(path.join(dir, "version.json"), JSON.stringify(version));
console.log("version.json built:", version.builtAt);
