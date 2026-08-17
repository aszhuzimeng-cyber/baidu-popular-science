# 交互体验作品集

统一入口页，展示两个可交互 Demo：

| Demo | 路径 | 说明 |
| --- | --- | --- |
| 儿童弱视机制互动科普 | `/amblyopia/` | Three.js 双眼视觉科普体验 |
| 数字皮影交互系统 | `/shadow-story/` | React 皮影拼装与演出互动 |

## 本地预览

首次运行先安装两个子项目的依赖：

```bash
npm run install:demos
npm run dev
```

浏览器打开 **http://127.0.0.1:4173**，首页点卡片即可进入对应 Demo。

**注意：** 必须通过 `npm run dev` 启动本地服务访问，不要直接双击 `site/index.html`，否则 Demo 链接会显示 Not found。

仅重新构建静态站点：

```bash
npm run build
```

输出目录为 `dist/`。

## 发布到 GitHub Pages（简历链接）

### 第一次部署

1. 在 GitHub 新建一个**空仓库**（不要勾选 README），例如 `interactive-portfolio`。
2. 在本项目根目录执行（把 `你的用户名` 和 `仓库名` 换成你的）：

```bash
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

3. 打开仓库 **Settings → Pages → Build and deployment**，Source 选择 **GitHub Actions**。
4. 等 Actions 里的 `Deploy portfolio to GitHub Pages` 跑绿（大约 2–3 分钟）。
5. 回到 **Settings → Pages**，复制站点地址，写进简历。

### 简历里可以放的链接

普通项目仓库（最常见）：

- 作品集首页：`https://你的用户名.github.io/仓库名/`
- 数字皮影：`https://你的用户名.github.io/仓库名/shadow-story/`
- 弱视科普：`https://你的用户名.github.io/仓库名/amblyopia/`

如果仓库名是 `你的用户名.github.io`（用户主页仓库），首页地址则是：

- `https://你的用户名.github.io/`

### 后续更新

改完代码后：

```bash
git add .
git commit -m "更新作品集"
git push
```

推送后会自动重新构建并发布。

## 目录结构

```
site/           # 统一入口页源码
amblyopia/      # 弱视科普 Demo
shadow story/   # 数字皮影 Demo
scripts/        # 构建与本地服务脚本
dist/           # 构建产物（GitHub Pages 发布此目录）
```
