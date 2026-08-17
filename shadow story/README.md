# 数字皮影交互系统

这是一个基于 React、TypeScript、Vite、Tailwind CSS、Framer Motion 和 Zustand 的横屏交互项目，包含皮影拼接、场景布置、幕上表演三个主要页面。

## 本地运行

```bash
npm install
npm run dev
```

## 打包上线

```bash
npm run build
npm run preview
```

`npm run build` 会生成 `dist/`。如果要直接部署静态页面，使用最新生成的 `dist/` 文件夹即可。

## 资源目录

- `public/assets/images/ui/`：界面按钮、标题、背景和弹窗图片。
- `public/assets/images/scene/`：场景装饰图片。
- `public/assets/images/characters/`：皮影角色整图和拆分部件图片。
- `public/assets/fonts/`：页面实际加载的字体子集。

## 交付说明

源码交付时需要保留 `src/`、`public/`、配置文件、`package.json`、`package-lock.json` 和本说明文件。

不需要随源码一起交付 `node_modules/`、浏览器测试缓存、日志文件、TypeScript 构建缓存等过程文件；这些已经写入 `.gitignore`。
