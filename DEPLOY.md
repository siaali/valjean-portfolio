# 上线操作清单（VALJEAN 作品集）

这份清单按时间顺序写，照着做即可。目标：**国内外都能打开、都能看视频**。

---

## 现在的状态（已经帮你做好）

- 本地已初始化 git 仓库，`main` 分支有一个干净的首次提交。
- 远程地址已指向 `https://github.com/siaali/valjean-portfolio.git`。
- 视频、项目工作日志都已在 `.gitignore` 里排除，**不会误传上公开仓库**。
- 网站代码已支持**双源**：大陆访客自动走国内源，海外访客自动走 R2 源；某源加载失败会自动换另一个。访客也可在网址后加 `?r=cn` / `?r=global` / `?r=auto` 手动切换。
- 域名 `valjean.com` 已被注册（1999 年），**买不到**；已选 `valjeanfilms.com`（实测可注册）。

**还没做的**：建 GitHub 仓库、推代码、开 Vercel、开 R2 传视频、填视频链接、买域名解析。

---

## 第 1 步：建 GitHub 仓库并推送代码

1. 打开 <https://github.com/new>，登录你的账号 `siaali`。
2. Repository name 填 `valjean-portfolio`，**不要**勾选 Initialize with README / .gitignore / license（远程必须为空，否则和本地冲突）。
3. 点 Create repository。
4. 建好后在这个项目目录执行（把下面两行贴进终端）：

   ```bash
   cd "/Users/skyrental/WorkBuddy AI/个人作品集网站"
   git push -u origin main
   ```

   如果弹出 GitHub 登录窗口，按提示授权即可（或用 Personal Access Token）。
5. 刷新 GitHub 仓库页面，应能看到 `index.html`、`work.html`、`data/`、`assets/` 等文件，**不应有** `assets/video/` 和 `.workbuddy-ai/`。

> 若第 4 步报 `repository not found` 或权限错，多半是仓库名/账号名不对，或建仓库时勾选了初始化文件——删掉重建一个空仓库再推。

---

## 第 2 步：Vercel 部署页面（几分钟就好）

1. 打开 <https://vercel.com/signup>，用 GitHub 账号登录（授权 Vercel 读仓库）。
2. 进 dashboard 点 **Add New → Project**，Import 刚才的 `valjean-portfolio`。
3. Framework Preset 选 **Other**（纯静态站），Build Command 留空，Output Directory 填 `.`。
4. 点 Deploy，等 1–2 分钟。
5. 成功后 Vercel 会给一个临时网址，形如 `https://valjean-portfolio-xxx.vercel.app`。
6. 打开临时网址检查：页面能显示、图片正常、切视图正常。**此时视频还是黑的**，因为视频链接还没填，属正常。

> Vercel 以后会自动部署：你在 GitHub 网页改 `works.json` 保存，1–2 分钟后线上自动更新。

---

## 第 3 步：Cloudflare R2 传视频（耗时最长）

R2 用来给海外访客放视频，免备案、不收出口流量费。

1. 注册 <https://dash.cloudflare.com/sign-up>，进 **R2** 服务。
2. 创建存储桶（Bucket），名字随意，如 `valjean-films`。
3. 上传视频：把 `assets/video/stream/` 下的 9 个 mp4 和 `assets/video/hero-loop-small.mp4` 共 10 个文件传上去。**这是最耗时的一步**（1.2GB，看网速几十分钟到一小时）。
   - 注意：其中 4 个文件是软链接，指向 `~/Downloads/阿让-视频作品/`，传的时候要传**链接指向的真实文件**，别直接拖软链接。
4. 让视频能用网址直接访问，两种方式任选：
   - **推荐**：桶设置里开启 **R2.dev 子域名**（`pub-<随机>.r2.dev`），立即可用，但域名不好看、有速率限制。
   - 或在桶的 **Custom Domains** 绑定一个你自己的子域（如 `media.valjeanfilms.com`），更适合长期使用。
5. 上传完成后，每个视频会有一个形如
   `https://pub-xxxx.r2.dev/work-01.mp4` 的直链。把这 10 条链接**记下来**，下一步要用。

> 上传时如果卡住或失败，R2 支持断点续传的多部分上传，可用官方工具 `rclone` 或 Cloudflare 网页上传；网页版对小文件更省事。

---

## 第 4 步：把视频链接填进 works.json（关键）

这是让视频从黑屏变成能播的一步。**在 GitHub 网页上改**（不用本地命令行）：

1. 打开仓库里的 `data/works.json`，点右上角铅笔图标编辑。
2. 首屏视频：找到 `site.hero`，把 `videoGlobal` 的值改成第 3 步拿到的首屏视频直链：

   ```json
   "hero": {
     "video": "assets/video/hero-loop-small.mp4",
     "poster": "assets/img/hero-poster.jpg",
     "videoGlobal": "https://pub-xxxx.r2.dev/hero-loop-small.mp4",
     "videoCn": ""
   }
   ```

   - `video` 保留本地路径不动（本地预览用）。
   - `videoGlobal` 填 R2 链接。
   - `videoCn` 现在留空，等以后办完备案再填国内链接。

3. 作品视频：每条作品都有 `videoGlobal` 和 `videoCn` 两个空字段。把 8 条作品的 `videoGlobal` 分别填上对应的 R2 直链。例如：

   ```json
   {
     "id": "w01",
     "video": "assets/video/stream/work-01.mp4",
     "videoGlobal": "https://pub-xxxx.r2.dev/work-01.mp4",
     "videoCn": ""
   }
   ```

   特别注意 `w02` 是 2 支片的系列，它的 `video` 是数组，数组里**每一项**都有自己的 `urlGlobal` 字段，两支片要分别填。

4. 拉到页面底部，点 **Commit changes**。Vercel 会在 1–2 分钟后自动重新部署。
5. 打开临时网址验证：视频能点开播放了。

**为什么还留着 `videoCn` 空着？** 因为国内源需要已备案域名（见第 6 步）。现在留空时，大陆访客会自动用 R2 源（能看，但晚高峰可能慢）；等你备案下来填了国内链接，大陆访客会自动切到又快又稳的国内源，**代码一行都不用改**。

---

## 第 5 步：买域名并解析到 Vercel

1. 去任意域名商买 `valjeanfilms.com`（阿里云 / 腾讯云 / Namesilo / Cloudflare Registrar 都可以，哪家便宜用哪家）。
2. 买好后到 Vercel 项目 → Settings → Domains，输入 `valjeanfilms.com` 添加。
3. Vercel 会给出 DNS 记录（通常是一条 `A` 记录指向 `76.76.21.21`，或 `CNAME` 指向 `cname.vercel-dns.com`）。
4. 到域名商的 DNS 管理页，按 Vercel 给的值添加解析记录。
5. 等 10 分钟到几小时生效。生效后用 `https://valjeanfilms.com` 访问，页面正常即成功。

> 顶级域名 `valjeanfilms.com` 和 `www.valjeanfilms.com` 建议都加到 Vercel，它会自动处理跳转。

---

## 第 6 步（可选，国内提速）：备案 + 国内源

这一步**不影响上线**，只影响国内播放速度。想做的时候再启动：

1. 在阿里云或腾讯云买一台最便宜的国内服务器（备案需要，约几十元/月）或买他们的"备案服务码"。
2. 提交 ICP 备案，通常 2–4 周。备案主体可以是你或客户。
3. 备案通过后，在同一家云厂商开对象存储 OSS / COS，把 10 个视频再传一份。
4. 给存储桶绑定一个**已备案**的子域名（如 `media.valjeanfilms.com`）作为 CDN 加速域名。
5. 拿到国内直链后，填进 `works.json` 所有 `videoCn` 字段（以及 `site.hero.videoCn`），提交。
6. 大陆访客从此自动走国内源，速度和稳定性最好；海外访客仍走 R2，互不影响。

---

## 日常维护（以后加作品 / 改内容）

都在 GitHub 网页改 `data/works.json`，保存后 Vercel 1–2 分钟自动更新，**不用碰代码、不用本地命令行**。

- **补文字**：每条作品的 `client`（客户）、`year`（年份）、`note`（阐述）现在都是空的，随时可填。
- **加新作品**：
  1. 视频传到 R2，拿到直链（以后有国内源就两边都传）。
  2. 在 `works` 数组里复制一整条 `{...}`，改 `id`（小写英文+连字符）、`title`、`cover`（封面图要先放进 `assets/img/`）、`video`、`videoGlobal`、`videoCn`、`aspect`、`stills`（静帧数组）。
  3. 保存。首页自动多一张卡片，详情页自动生成。
- **换视频 / 换封面**：改对应链接或替换 `assets/img/` 里的图片文件。
- **多支片的系列**：把 `video` 写成数组，每项可带 `url` / `urlGlobal` / `urlCn` / `label` / `aspect` / `poster`。参考现有的 `w02`。

详细字段说明见 `README.md`。

---

## 出问题时的速查

| 现象 | 可能原因 | 怎么办 |
|---|---|---|
| 页面打开但视频黑屏 | `works.json` 的 `videoGlobal` 还空着 | 完成第 3、4 步 |
| 海外能看、大陆很慢 | `videoCn` 空着，大陆在用 R2 | 完成第 6 步，或先用 `?r=global` 确认不是源本身的问题 |
| 视频提示加载失败 | 直链写错 / R2 桶权限没开公有读 | 检查链接能否在浏览器直接打开；R2 桶开启公开访问 |
| 改了 json 线上没变 | Vercel 还在部署 | 等 1–2 分钟，看 Vercel 部署记录是否成功 |
| 域名打不开 | DNS 没生效 / 解析值填错 | 对照 Vercel Domains 页给的值检查 DNS，等几小时 |
| 想强制某个源测试 | —— | 网址后加 `?r=cn` 或 `?r=global`；加 `?r=auto` 恢复自动 |
