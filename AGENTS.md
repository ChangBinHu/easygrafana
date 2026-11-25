# EasyGrafana 开发约定

本目录是本机 EasyGrafana 浏览器扩展的开发管理目录。后续源码、测试、需求和开发文档统一在这里维护。

- 本仓库维护浏览器扩展源码、测试和文档。
- 这是 Chrome / Edge Manifest V3 扩展，保留根目录运行文件布局。
- 回归验证：`node --test tests/*.test.cjs`。
- 本地演示：`node dev-server.cjs`，访问 `http://127.0.0.1:4178/explore`。
- 打包：`python3 package.py`，输出 `dist/EasyGrafana.zip`；生成物不纳入 Git。
- 运行逻辑变更需核对简易/高级模式、grep 日志数据源/Loki 语法及原查询范围保留行为。真实 Grafana 页面验证与本地测试结果分别说明。
- 浏览器加载目录由用户在扩展管理页选择；仅修改本目录不会更新从旧桌面目录加载的扩展。

- 公开文件使用虚构示例和 example.com 域名，不写入公司名称、真实部署信息、业务标识、本机绝对路径或凭据。
