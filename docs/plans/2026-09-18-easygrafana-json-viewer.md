# JSON selection viewer

Goal: Grafana Explore 选中合法 JSON 自动格式化弹窗。
Design: 独立 json-viewer.js，由 content.js 以现有页面识别回调启用；原生 dialog + Shadow DOM；textContent 展示；纯函数验证后保留原始数字词法格式化。编辑区不触发，普通文本忽略，Esc/关闭按钮退出，复制不自动执行。
Validation: JSON 纯函数测试 + 本地浏览器真实选中/关闭验证；打包新增脚本并同步桌面两个目录。
