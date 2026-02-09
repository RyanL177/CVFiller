# CVFiller 简历解析后端

## 功能说明

支持解析 PDF 和 DOCX 格式的简历文件，使用 Google Gemini API 提取结构化信息。

## 输出 JSON 格式

```json
{
  "status": "success",
  "source_file": "resume.pdf",
  "parsed_data": {
    "personal_info": {
      "name": "姓名",
      "phone": "电话",
      "email": "邮箱",
      "hometown": "籍贯",
      "gender": "性别",
      "birth_date": "出生日期",
      "political_status": "政治面貌"
    },
    "education": [...],
    "work_experience": [...],
    "projects": [...],
    "skills_certifications": {...}
  }
}
```

## 安装依赖

```bash
pip install -r requirements.txt
```

## 配置 API Key

设置环境变量：

```bash
export GEMINI_API_KEY="your-google-api-key"
```

或在代码中修改：

```python
GEMINI_API_KEY = "your-api-key"
```

## 使用方法

### 1. 直接解析文件

```python
from resume_parser import parse_resume

result = parse_resume("path/to/resume.pdf")
print(result)
```

### 2. 从字节流解析（Web 上传场景）

```python
from resume_parser import parse_resume_from_bytes

# file_bytes 是从上传请求中获取的文件内容
result = parse_resume_from_bytes(file_bytes, "resume.pdf")
```

### 3. 启动 FastAPI 服务

取消代码底部的注释并运行：

```bash
python resume_parser.py
# 或
uvicorn resume_parser:app --reload --host 0.0.0.0 --port 8000
```

## API 端点

- `POST /api/parse-resume` - 上传并解析简历文件
- `GET /health` - 健康检查

## 日期格式规范

所有日期统一使用 `YYYY-MM` 格式，例如：
- 2023-09（2023年9月）
- 2024-06（2024年6月）
- 2020-01（2020年，只知道年份时默认使用01月）
