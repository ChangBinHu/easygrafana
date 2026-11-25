# EasyGrafana 下拉语法提示

Goal: 输入框聚焦、输入或点击下拉箭头时展示支持语法与常用查询。
Architecture: 复用现有 combobox，语法模板追加到末尾并选中示例词，历史查询保留原有替换行为。模板不执行查询；保持 NOT/OR 现有解析规则。
Tech Stack: 原生 JavaScript、Shadow DOM、node:test。

1. history.js 增加模板与填入纯函数，测试现有内容保留、短语和批量排除的选区。
2. content.js 接入统一候选项、键盘选择、无历史时展开；说明模板为追加，历史为替换。
3. 更新需求和版本，运行现有测试并打包到桌面两个目录。
