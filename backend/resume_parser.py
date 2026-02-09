"""
简历解析后端服务
支持 PDF 和 DOCX 格式，使用 Google Gemini API 提取结构化信息
"""

import os
import json
import tempfile
from typing import Optional, Dict, Any
from pathlib import Path
import fitz  # PyMuPDF
import docx2txt
import requests


# 腾讯 Hunyuan 大模型 API 配置
AI_API_KEY = os.environ.get("AI_API_KEY", "DecU74WXOm8RZ9AnD8F5Ea60AaDd4c4e9729031e302324Ba")
AI_API_URL = os.environ.get("AI_API_URL", "https://tcamp.qq.com/openai/chat/completions")


# System Prompt 用于指导 AI 解析简历
RESUME_PARSER_SYSTEM_PROMPT = """你是一个专业的简历解析助手，专门为中国校招网申场景设计。

请仔细分析提供的简历文本，提取关键信息并输出为严格的 JSON 格式。

**输出 JSON 结构要求：**

```json
{
  "personal_info": {
    "name": "姓名",
    "phone": "电话",
    "email": "邮箱",
    "hometown": "籍贯/户籍所在地",
    "gender": "性别",
    "birth_date": "出生日期 (YYYY-MM-DD)",
    "political_status": "政治面貌"
  },
  "education": [
    {
      "school": "学校全称",
      "major": "专业",
      "degree": "学位（本科/硕士/博士）",
      "start_date": "开始时间 (YYYY-MM)",
      "end_date": "结束时间 (YYYY-MM)",
      "gpa": "GPA",
      "rank": "排名（如：前10%）",
      "core_courses": ["核心课程1", "核心课程2"]
    }
  ],
  "work_experience": [
    {
      "company": "公司全称",
      "position": "职位",
      "start_date": "开始时间 (YYYY-MM)",
      "end_date": "结束时间 (YYYY-MM)",
      "description": "工作描述",
      "achievements": ["关键成就1", "关键成就2"]
    }
  ],
  "projects": [
    {
      "name": "项目名称",
      "role": "担任角色",
      "tech_stack": ["技术1", "技术2"],
      "start_date": "开始时间 (YYYY-MM)",
      "end_date": "结束时间 (YYYY-MM)",
      "description": "项目描述"
    }
  ],
  "skills_certifications": {
    "skills": ["技能1", "技能2"],
    "languages": [{"language": "语言", "proficiency": "熟练程度"}],
    "certifications": ["证书1", "证书2"],
    "awards": ["奖项1", "奖项2"]
  }
}
```

**重要规则：**

1. **日期格式**：所有日期必须使用 "YYYY-MM" 格式（如：2023-09），如果只有年份，使用 "YYYY-01"

2. **时间顺序**：教育背景、工作经历、项目经历按时间倒序排列（最近的在前）

3. **字段处理**：
   - 如果信息不存在，使用空字符串 "" 或空数组 []
   - 保持原文中的专有名词（公司名、学校名等）
   - 提取所有可能的联系方式

4. **教育背景**：
   - 区分本科、硕士、博士
   - GPA 和排名如果存在请提取
   - 核心课程列出 3-8 门

5. **工作经历/实习**：
   - 区分全职工作和实习经历
   - 提取量化成果（如：提升效率30%）
   - 关键成就用数组形式列出

6. **项目经历**：
   - 提取使用的技术栈
   - 明确个人角色和贡献

7. **技能证书**：
   - 技术技能单独列出
   - 语言能力注明熟练程度
   - 专业证书和获奖情况

**请只输出 JSON，不要有其他说明文字。**
"""


def extract_text_from_pdf(file_path: str) -> str:
    """从 PDF 文件提取文本"""
    text = ""
    try:
        with fitz.open(file_path) as pdf:
            for page_num in range(len(pdf)):
                page = pdf[page_num]
                text += page.get_text()
    except Exception as e:
        print(f"PDF 解析错误: {e}")
        raise
    return text


def extract_text_from_docx(file_path: str) -> str:
    """从 DOCX 文件提取文本"""
    try:
        text = docx2txt.process(file_path)
        return text
    except Exception as e:
        print(f"DOCX 解析错误: {e}")
        raise


def extract_text_from_file(file_path: str) -> str:
    """根据文件类型提取文本"""
    file_extension = Path(file_path).suffix.lower()
    
    if file_extension == '.pdf':
        return extract_text_from_pdf(file_path)
    elif file_extension in ['.docx', '.doc']:
        return extract_text_from_docx(file_path)
    else:
        raise ValueError(f"不支持的文件格式: {file_extension}")


def parse_resume_with_hunyuan(resume_text: str) -> Dict[str, Any]:
    """使用腾讯 Hunyuan 大模型 API 解析简历文本"""
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {AI_API_KEY}"
    }
    
    payload = {
        "model": "hunyuan-lite",
        "messages": [
            {
                "role": "system",
                "content": RESUME_PARSER_SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": f"以下是简历文本内容，请解析：\n\n{resume_text}"
            }
        ],
        "temperature": 0.1,
        "max_tokens": 4096
    }
    
    try:
        response = requests.post(
            AI_API_URL,
            headers=headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        
        # 提取生成的文本 (OpenAI 兼容格式)
        if "choices" in result and len(result["choices"]) > 0:
            generated_text = result["choices"][0]["message"]["content"]
            
            # 解析 JSON
            try:
                parsed_data = json.loads(generated_text)
                return parsed_data
            except json.JSONDecodeError as e:
                print(f"JSON 解析错误: {e}")
                print(f"原始响应: {generated_text}")
                # 尝试清理后重新解析
                cleaned_text = generated_text.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3]
                return json.loads(cleaned_text.strip())
        else:
            raise Exception(f"API 返回结果异常: {result}")
            
    except requests.exceptions.RequestException as e:
        print(f"API 请求错误: {e}")
        raise
    except Exception as e:
        print(f"解析错误: {e}")
        raise


def parse_resume(file_path: str) -> Dict[str, Any]:
    """
    主函数：解析简历文件
    
    Args:
        file_path: 简历文件路径 (PDF 或 DOCX)
    
    Returns:
        解析后的结构化 JSON 数据
    """
    # 1. 提取文本
    print(f"正在提取文件: {file_path}")
    resume_text = extract_text_from_file(file_path)
    
    if not resume_text.strip():
        raise ValueError("无法从文件中提取文本")
    
    print(f"提取文本长度: {len(resume_text)} 字符")
    
    # 2. 调用 AI 解析
    print("正在调用 Hunyuan AI 解析...")
    parsed_data = parse_resume_with_hunyuan(resume_text)
    
    # 3. 添加元数据
    result = {
        "status": "success",
        "source_file": Path(file_path).name,
        "parsed_data": parsed_data
    }
    
    return result


def parse_resume_from_bytes(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    从字节流解析简历（用于 Web 上传场景）
    
    Args:
        file_bytes: 文件字节内容
        filename: 文件名（用于判断格式）
    
    Returns:
        解析后的结构化 JSON 数据
    """
    # 创建临时文件
    file_extension = Path(filename).suffix.lower()
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
        tmp_file.write(file_bytes)
        tmp_path = tmp_file.name
    
    try:
        result = parse_resume(tmp_path)
        return result
    finally:
        # 清理临时文件
        os.unlink(tmp_path)


# ==================== FastAPI 服务 ====================

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="CVFiller 简历解析服务")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/parse-resume")
async def api_parse_resume(file: UploadFile = File(...)):
    """
    简历解析 API 端点
    """
    # 检查文件类型
    allowed_extensions = {'.pdf', '.docx', '.doc'}
    file_extension = Path(file.filename).suffix.lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"不支持的文件格式。请上传: {', '.join(allowed_extensions)}"
        )
    
    try:
        # 读取文件内容
        contents = await file.read()
        
        # 解析简历
        result = parse_resume_from_bytes(contents, file.filename)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "CVFiller Resume Parser"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


# ==================== 测试示例 ====================

if __name__ == "__main__":
    # 测试代码
    test_file = "test_resume.pdf"  # 替换为实际文件路径
    
    if os.path.exists(test_file):
        try:
            result = parse_resume(test_file)
            print("\n解析结果:")
            print(json.dumps(result, ensure_ascii=False, indent=2))
        except Exception as e:
            print(f"解析失败: {e}")
    else:
        print(f"测试文件不存在: {test_file}")
