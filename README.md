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

## 发布到 GitHub Pages

1. 将整个仓库推送到 GitHub（默认分支 `main`）。
2. 打开仓库 **Settings → Pages → Build and deployment**，Source 选 **GitHub Actions**。
3. 推送后，`.github/workflows/pages.yml` 会自动构建并发布。

发布后访问地址：

- 用户/组织主页仓库：`https://<username>.github.io/`
- 普通项目仓库：`https://<username>.github.io/<repo-name>/`

站点使用相对路径，GitHub Pages 上两个 Demo 均可正常打开：

- 弱视科普：`https://<username>.github.io/<repo-name>/amblyopia/`
- 数字皮影：`https://<username>.github.io/<repo-name>/shadow-story/`

把首页链接放进简历或作品集即可。

## 目录结构

```
site/           # 统一入口页源码
amblyopia/      # 弱视科普 Demo
shadow story/   # 数字皮影 Demo
scripts/        # 构建与本地服务脚本
dist/           # 构建产物（GitHub Pages 发布此目录）
```
