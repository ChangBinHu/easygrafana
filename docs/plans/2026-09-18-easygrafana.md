# EasyGrafana Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 按用户要求将已有扩展升级为跨域自动生效的 EasyGrafana。

**Architecture:** 沿用已确认的关键词输入界面，自动识别 Explore 路径与 Grafana 标识/日志查询结构。独立适配旧数组、left/right 对象和 panes URL；按数据源选择 grep 日志数据源 grep 或 Loki LogQL，不将其他数据源当成日志改写。自动展开搜索框但不抢焦点。

**Tech Stack:** Manifest V3、原生 JS、Shadow DOM、Node test runner。

## 任务

1. 扩充 `tools/easygrafana/tests/query.test.cjs`，覆盖任意 HTTP(S) 域名、子路径、三代 Explore 状态、多个 pane/query、日志管道保留、非日志和未知格式的保护；先运行观察新增测试失败。
2. 修改 `query.js`：`targets(href)` 返回可编辑查询；`context(href,targetId)` / `buildURL(href,input,targetId)` 定位修改目标；`compile(input,'loki')` 输出标准 `|=` / `!=`。
3. 修改 `content.js`：仅识别到 Grafana 日志页时挂载，自动展开且不聚焦；监听 SPA URL/DOM 变更，提供多查询选择；显示原有环境及时间，保留高级 Loki 管道。
4. 修改 manifest 为 EasyGrafana 1.1.0，匹配所有 HTTP(S) 站点；只读当前页面，无凭证/日志抓取，无后台请求。安装/升级时浏览器可能要求一次站点权限授权。
5. 更新本地演示覆盖 Loki、grep 日志数据源、Grafana SPA 切换、普通页面；自动测试和本地浏览器交互均通过后打包。
6. 更新 README/验证说明，交付至桌面 `tool/EasyGrafana` 和 `EasyGrafana.zip`；同时同步旧目录，保证之前按旧路径加载的扩展可直接刷新。

## 范围

任意域名不等于任意数据源/任意 Grafana 页面版本。支持已知 Explore 日志 URL 与 grep 日志数据源/Loki。Dashboard、SQL/Prometheus/Elasticsearch、自定义且无法识别的日志插件保持不改写。新页面尚未选定日志范围时展示引导；无需手动填域名或环境配置。

## 依据

- https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/
- https://grafana.com/docs/loki/latest/query/log_queries/
- https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns
