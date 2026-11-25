# grep 日志数据源 Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 交付可安装的 grep 日志数据源 简化搜索浏览器扩展。

**Architecture:** 独立无依赖 Manifest V3 content script，通过 Shadow DOM 提供输入面板；纯函数编译关键词并更新 Explore URL，原页面负责查询和登录。

**Tech Stack:** JavaScript、Chrome/Edge Manifest V3、Node test runner、HTML/CSS。

---

### Task 1: 语法与 URL 编译
- Create `tools/easygrafana/query.js` and `tools/easygrafana/tests/query.test.cjs`.
- 先写测试并运行 `node --test tools/easygrafana/tests/query.test.cjs`，验证功能缺失时失败。
- 实现 `compile('id ProcessRequest -debug')` → `grep id | grep ProcessRequest | grep -v debug`。
- 测试短语、空输入、缺少引号、危险分隔符、URL 上下文错误，以及其他 URL 参数/多查询/时间的保留。
- 实现后运行同一命令，应全部通过。

### Task 2: 扩展与面板
- Create `tools/easygrafana/manifest.json`, `content.js`, `popup.html`.
- 只匹配用户指定 grep 日志数据源 域名，使用浮动按钮和可收起的搜索面板。
- 展示上下文、预览、复制、错误反馈，支持 Enter 和 Escape、IME 输入。
- 每次提交重新读取当前 URL，避免 SPA 切换后沿用旧条件。

### Task 3: 验证与交付
- Create `tools/easygrafana/demo.html`, `README.md`, `package.py`.
- 本地演示页加载相同脚本并提供模拟的旧版 Explore URL 数据；不调用真实日志服务。
- 使用浏览器验证搜索预览、错误阻断、折叠展开、URL 更新和参数保留。
- 打包白名单文件为 `tools/easygrafana/dist/easygrafana.zip`，检查 ZIP 和 manifest。
- 清楚区分本地验证与因目标站点不可用而未完成的真实站点验收。
