# EasyGrafana 1.2.0 验证记录

- Node 自动测试 30 项通过（查询语法、URL 保留、模式切换、原输入框唯一映射、复杂编辑器排除、grep 日志数据源 标签分离）。
- 使用 Chrome DevTools Elements 在实际 grep 日志数据源 页面确认：query-row / Query editor row 内为普通 textarea，body.theme-dark。
- 本地同构查询区域使用实际运行时代码验证：原位替换；简易包含/排除同步；原生 Run Query 收到编译语句；插件搜索按钮调用原生按钮；高级切换保留语句；不完整引号禁用搜索并拦截 Run Query。
- 本地验证主题、普通页面退出和 SPA 重新定位。
- 尚未在真实站点重载扩展后执行日志查询；原生 React 状态接受合成事件及服务端结果需要现场验收。
- Monaco 等富编辑器保留原生框，嵌入辅助栏通过 URL 查询；不声明所有 Grafana 版本完成替换适配。


## 1.3.0 增量验证

- 38 项自动测试通过：新增 NOT 单项/分组/中文括号/短语/错误语法/字面 NOT 往返，历史排序/上限/损坏记录处理/隔离，后台多标签并发计数和清空范围测试。
- 本地 UI：提交 request123 NOT （11 22），原生查询收到 grep request123 | grep -v 11 | grep -v 22。
- 插件按钮与原生按钮各提交一次，刷新后下拉显示使用 2 次。选中填入且收起，不触发搜索；方向键/Enter 可选取。
- 本地演示使用独立的 demo-only 存储适配器；真实扩展使用 chrome.storage.local，后台逻辑经过自动测试，尚未在已安装 Chrome 扩展中重载验收。

## 1.3.1

39 项测试通过。简易模式拒绝减号排除；两种数据源反向转换均生成 NOT；保留高级原文和 NOT 批量排除。界面提示和文档已同步，旧语法历史不再展示为候选。

## 1.4.0

40 项自动测试通过。新增词拆分、短语、连续空格、排除分组及不完整输入的解析测试。本地 UI 验证 11 22 "11 22" NOT (33 "44 55") 展示 5 个独立标签（两个短语），原生 Run Query 收到一致的 grep 语句。已目视检查标签边框、包含/排除颜色及短语标记。

## 1.4.1

仅调整检索词展示。已在本地 UI 目视确认 11、22、11 22 三个色块有独立底色和间隙，短语整体包裹，排除词为橙色带 NOT。查询内容保持一致。

## 1.5.0

44 项自动测试通过，包含 OR 分组、括号/短语/中文括号、混合条件歧义、往返转换，以及实际调用本机 grep -E 验证正则符号按字面匹配。本地 UI 确认 OR 色块分组，Run Query 收到 grep request123 | grep -E "(11|22 33)" | grep -v debug。真实 grep 日志数据源 服务器 OR 查询结果尚未现场验收。

## 1.6.0

45 项测试通过；新增高亮分段逐字符保真、短语/NOT/OR 语义、无效输入回退测试。本地目视确认色块仅在输入框内，实际查询内容一致。长输入的原生 scrollLeft=732 时高亮同步 translateX(-732px)，末尾短语底色对齐。

## 1.6.1

46 项测试通过，新增高级检索字段移除环境前缀、提交保留环境、清空条件、模式往返及禁止在检索字段改环境。实际本地 UI 显示 grep request123 | grep ProcessRequest，编辑后原生按钮收到 grep request123 | grep -v debug。

## 1.6.2
- node --test tests/*.test.cjs：47 项通过。
- 本地浏览器验证聚焦展开五种语法提示；选择批量 NOT 模板后输入 debug timeout，原查询保留且示例词正确替换。
- 未向真实 Grafana 服务执行查询。

## 1.7.0
- 51 项 node:test 通过；包括 JSON 字符串、对象数组、非法输入、长 ID 保真和深度/长度限制。
- 本地页面选中 JSON 后弹窗成功，显示完整长数字和缩进；Esc 关闭验证通过。

## 1.7.1
- 修复前 grep 日志数据源 expr-only 复现测试失败（0 个可编辑查询），修复后通过。
- 共 53 项测试通过；覆盖未知源高级模式、已知源简易模式、多查询互不覆盖。
- 本地浏览器 grep 日志数据源 场景确认自动嵌入；未在实际 Docker 日志服务运行查询。

## 1.7.2
- 新增不含外层引号的转义 JSON 回归测试：修复前失败，修复后通过。
- 全部 55 项测试通过，覆盖多层转义、路径和换行、长数字、不完整输入拒绝。
- 本轮浏览器连接超时，未完成真实选中弹窗复测；已增加本地演示样例。

## 1.8.0
- 58 项测试通过，新增复制顺序/重复日志/换行、空结果保护、复制失败后清理测试。
- 语法检查通过。日志选择器参考 Grafana v7.5.0 官方 getLogRowStyles.ts / LogRowMessage.tsx 源码。
- 真实 Grafana 页面 DOM 与剪贴板交互未实测。

## 1.8.1
- 根据用户 多区域日志数据源 链接建立回归测试；修复前 mode 为 advanced，修复后 simple。
- 59 项测试通过，包含 NOT/OR 双模式往返、环境与 timestamp 保留。
- 未在真实美国环境执行日志查询。

## 1.9.0
- 共 62 项 node:test 通过；新覆盖重命名数据源语法推断、类型优先、手动选择与清除、站点/组织/数据源隔离、复杂 grep 保留高级模式。
- query.js / content.js 语法检查通过。
- 本轮浏览器验证连接超时，未完成选择器及持久存储端到端交互复测。

## 1.10.0
- 63 项测试通过，删除回归覆盖短语、重复词、NOT 批量排除、OR 分支缩减、末项删除、非法语法和越界位置。
- content.js 语法检查通过；页面按钮布局尚未浏览器复测。

## 1.10.1
- 本地浏览器验证默认无删除按钮、点击第一个词只显示对应 ×、按钮处于色块右上角且输入保持单行、点击删除保留第二词并隐藏按钮。
- content.js 语法检查通过。


## 2026-10-24 · 1.11.0
- Node tests: 65/65 passed. Added literal selection/quoted phrase/reserved words/OR grouping/invalid selection tests.
- content.js syntax check passed.
- Local IAB: selected message in log row, button appeared, clicking appended message to request123 ProcessRequest, status confirmed pending search and URL remained unchanged.
- Real intranet Grafana not executed; installed Chrome extension requires reload and page refresh.


## 2026-10-24 · 1.11.1
- Added regression cases proving recent low-frequency items outrank old popular items, frequency breaks equal-time ties, and retention favors recency. Both new cases failed before fix and passed after fix.
- Full Node suite: 67/67 passed.


## 2026-10-24 · 1.11.2
- Reproduced missing toolbar with a stopped-bubbling mouseup in an isolated event harness; failed before capture-listener fix and passed after. Full suite 68/68 passed.
- Real Chrome tab inspection timed out. Actual installed version and this specific production-page cause remain unverified.


## 2026-10-24 · 1.11.3 real Chrome verification
- Chrome extension UI confirmed prior version 1.11.2 and desktop EasyGrafana path.
- Live page diagnosis: selected middleware had valid range; toolbar reached shown then hidden:scroll.
- Replaced scroll dismissal with position update; 69 tests passed, including layout-scroll regression.
- Reloaded extension and real Grafana tab; native double-click middleware produced persistent button. Clicking it appended middleware to the existing three search terms and displayed pending-search confirmation. Did not submit query.
- Screenshot: /tmp/easygrafana-selection-fixed.png


## 2026-10-24 · 1.11.4
- Added selected-text submission regression: successful addition calls run once; invalid and busy drafts do not submit or alter input.
- Full suite 70/70 passed. Desktop folders and ZIPs synchronized. Browser runtime requires extension reload and page refresh.
