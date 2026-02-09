# CVFiller - 智能简历信息提取助手

🎯 **专为校招网申设计** | 🤖 **AI 智能解析** | ⚡ **一键填写网申表格**

CVFiller 是一个面向中国学生的智能简历处理工具，帮助你在秋招/春招期间高效完成网申表格填写。通过 AI 技术自动提取 PDF/Word 简历中的关键信息，并整理成标准格式，支持一键导出或复制到剪贴板。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript)
![TDesign](https://img.shields.io/badge/TDesign-1.12-0052D9.svg)

---

## ✨ 功能特性

### 📝 智能信息提取
- 支持 PDF、DOC、DOCX 格式简历上传
- 自动识别并提取姓名、联系方式、邮箱
- 提取教育背景（学校、专业、学位、时间）
- 解析实习/工作经历（公司、职位、时间、描述）
- 提取项目经历（项目名称、角色、描述）
- 整理技能与证书信息

### 🎨 友好的交互界面
- 现代化的玻璃拟态设计风格
- 单栏简洁布局，清晰展示提取的信息
- 支持编辑模式，可手动校对和修改信息
- 每个字段支持单独复制，方便粘贴到网申表格

### 📋 多种导出方式
- 一键复制全部信息到剪贴板
- 导出为标准 JSON 格式
- 支持重新上传和编辑

---

## 🛠 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **UI 组件库**: TDesign React
- **样式**: Tailwind CSS
- **图标**: TDesign Icons + Lucide React

### 后端
- **语言**: Python 3.8+
- **框架**: FastAPI
- **文档解析**: PyMuPDF (PDF)、docx2txt (Word)
- **AI 服务**: 腾讯 Hunyuan 大模型 API

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Python 3.8+
- npm 或 yarn

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/cvfiller.git
cd cvfiller
```

### 2. 前端安装与启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

前端服务将在 `http://localhost:5173` 启动。

### 3. 后端安装与启动

```bash
cd backend

# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（可选，也可直接在代码中配置）
export AI_API_URL="https://tcamp.qq.com/openai/chat/completions"
export AI_API_KEY="your-api-key"

# 启动后端服务
python resume_parser.py
```

后端服务将在 `http://localhost:8000` 启动。

---

## 📁 项目结构

```
cvfiller/
├── src/
│   ├── App.tsx              # 主应用组件
│   ├── App.css              # 全局样式
│   ├── index.css            # Tailwind 引入
│   └── main.tsx             # 应用入口
├── backend/
│   ├── resume_parser.py     # 后端主程序
│   ├── requirements.txt     # Python 依赖
│   └── README.md            # 后端说明
├── public/                  # 静态资源
├── index.html               # HTML 模板
├── package.json             # 项目配置
├── tailwind.config.js       # Tailwind 配置
├── tsconfig.json            # TypeScript 配置
└── vite.config.ts           # Vite 配置
```

---

## 🔧 配置说明

### AI API 配置

编辑 `backend/resume_parser.py` 文件，修改以下配置：

```python
AI_API_KEY = "your-api-key"
AI_API_URL = "your-api-url"
```

或使用环境变量：

```bash
export AI_API_KEY="your-api-key"
export AI_API_URL="your-api-url"
```

---

## 📖 使用指南

1. **上传简历**: 点击"上传简历文件"按钮，选择 PDF 或 Word 格式的简历
2. **等待解析**: AI 将自动提取简历中的关键信息
3. **查看结果**: 提取的信息将按分类展示
4. **编辑校对**: 点击"编辑"按钮可以手动修改信息
5. **复制使用**: 悬停在字段上点击"复制"，粘贴到网申表格中
6. **导出 JSON**: 点击"导出 JSON"保存结构化数据

---

## 🎯 适用场景

- 🎓 **校招网申**: 快速提取简历信息，批量填写网申表格
- 💼 **实习申请**: 整理实习经历，高效完成申请
- 📝 **简历归档**: 将简历转换为结构化数据，便于管理
- 🔍 **信息检索**: 快速查找简历中的关键信息

---

## ⚠️ 注意事项

1. **文件格式**: 目前支持 PDF、DOC、DOCX 格式
2. **文件大小**: 单个文件不超过 10MB
3. **扫描件限制**: 图片型 PDF（扫描件）无法提取文本，需要可编辑的文档
4. **隐私保护**: 简历数据仅在本地处理，不会上传到第三方服务器（除 AI 解析服务外）

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

---

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证开源。

---

## 🙏 致谢

- [TDesign](https://tdesign.tencent.com/) - 腾讯开源设计体系
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [FastAPI](https://fastapi.tiangolo.com/) - 现代、快速的 Web 框架


---

⭐ **如果这个项目对你有帮助，欢迎 Star 支持！**
