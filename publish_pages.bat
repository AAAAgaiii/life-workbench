@echo off
chcp 65001 >nul
:: 构建并部署「生活工作台」单文件版到 GitHub Pages（gh-pages 分支）
:: 用法：在仓库根目录双击运行；需已配置好 git 对 origin 的推送权限。
title 发布工作台到 GitHub Pages
echo [1/4] 构建 standalone.html ...
node build_standalone.js
if errorlevel 1 (echo 构建失败 & pause & exit /b 1)

echo [2/4] 暂存本地改动并切到 gh-pages ...
git stash -u >nul 2>&1
git checkout gh-pages >nul 2>&1
git rm -rf . >nul 2>&1
copy standalone.html index.html >nul
echo. > .nojekyll
git add -A

echo [3/4] 提交并推送 ...
git commit -m "deploy: update workbench" >nul 2>&1 || echo （无变化，跳过提交）
git push origin gh-pages
if errorlevel 1 (echo 推送失败，请检查网络/代理后重试 & git checkout main >nul 2>&1 & git stash pop >nul 2>&1 & pause & exit /b 1)

echo [4/4] 切回 main 并恢复 ...
git checkout main >nul 2>&1
git stash pop >nul 2>&1
echo 完成。GitHub Pages 将在 1 分钟内更新：https://AAAAgaiii.github.io/life-workbench/
pause
