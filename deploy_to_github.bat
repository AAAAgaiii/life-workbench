@echo off
cd /d "%~dp0"
set "GIT=C:/Users/dj-neiqin/.workbuddy/binaries/PortableGit/versions/1.2.0/mingw64/bin/git.exe"

if not exist "%GIT%" (
  echo [错误] 找不到 git，请检查路径：
  echo %GIT%
  pause
  exit /b
)

echo ============================================================
echo   生活工作台 一键部署到 GitHub (jsDelivr 自动同步)
echo ============================================================
echo   本脚本把当前文件夹最新代码推送到你的 GitHub 仓库。
echo   执行到 push 时会弹出 GitHub 登录窗口，
echo   请用账号 AAAAgaiii 登录授权。
echo ============================================================
echo.
set /p confirm=确认用本地最新版覆盖 GitHub 旧版并部署？[Y/N]: 
if /i not "%confirm%"=="Y" (echo 已取消。 & pause & exit /b)

echo.
echo ---- 1/5 初始化仓库 ----
"%GIT%" init -q
"%GIT%" config user.name "zekai"
"%GIT%" config user.email "zekai@local"
"%GIT%" remote remove origin >nul 2>&1
"%GIT%" remote add origin https://github.com/AAAAgaiii/life-workbench.git

echo ---- 2/5 暂存文件 ----
"%GIT%" add -A

echo ---- 3/5 提交 ----
"%GIT%" diff --cached --quiet || "%GIT%" commit -m "deploy: v24 dashboard-fix + fitness + liuren + PWA"

echo ---- 4/5 切换到 main 分支 ----
"%GIT%" branch -M main

echo ---- 5/5 推送到 GitHub (此时会弹登录窗口，请用 AAAAgaiii 登录) ----
"%GIT%" push -u origin main --force

echo.
echo ============================================================
echo   执行结束。
echo   若上面出现 "Everything up-to-date" 或 "branch main -> main"，说明成功。
echo   若出现 Authentication failed，说明登录没成功，请重跑一次并登录。
echo   成功后等待 1~2 分钟，jsDelivr CDN 自动刷新生效。
echo ============================================================
pause
