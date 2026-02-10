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
    "email": "邮箱"
  },
  "education": [
    {
      "school": "学校全称",
      "major": "专业",
      "degree": "学位",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM"
    }
  ],
  "work_experience": [
    {
      "company": "公司全称",
      "position": "职位名称",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM",
      "description": "完整的工作描述，包括：工作职责、项目内容、使用的技术、取得的成果等所有详细信息，不要删减",
      "achievements": ["具体成果1", "具体成果2"],
      "tech_stack": ["技术1", "技术2"]
    }
  ],
  "projects": [
    {
      "name": "项目名称",
      "role": "担任角色",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM",
      "description": "完整的项目描述，包括：项目背景、个人职责、技术方案、项目成果等所有详细信息，不要删减",
      "achievements": ["具体成果1", "具体成果2"],
      "tech_stack": ["技术1", "技术2"]
    }
  ],
  "campus_experience": [
    {
      "organization": "组织名称",
      "role": "担任职位",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM",
      "description": "经历描述"
    }
  ],
  "skills_certifications": {
    "skills": ["技能1", "技能2"]
  }
}
```

**规则：**
1. 日期格式统一为 "YYYY-MM"
2. 按时间倒序排列
3. 没有的信息使用空字符串或空数组
4. 保持原文中的专有名词
5. 只输出 JSON，不要有其他文字
6. campus_experience 包括学生会、社团、志愿者、班级干部等校园活动经历
7. **重要：description 字段必须保留原始简历中的完整描述内容，不要删减或摘要，保留所有细节、成果数据、技术栈等信息**
8. **绝对禁止：如果简历中没有校园经历，campus_experience 必须返回空数组 []，严禁虚构或编造任何校园经历**
"""

# Prompt 用于生成简历修改建议
RESUME_ADVICE_PROMPT = """你是一位资深的简历优化专家，专门帮助中国学生优化校招简历。

请基于以下简历内容，提供专业的修改建议和优化意见。

【分析维度】
1. **格式与排版**
   - 是否简洁清晰
   - 重点是否突出
   - 是否有冗余信息

2. **内容质量**
   - 是否有量化成果（数字、百分比）
   - 是否使用STAR法则描述经历
   - 是否突出个人贡献和价值

3. **关键词优化**
   - 是否包含目标岗位相关关键词
   - 技能描述是否具体

4. **针对性建议**
   - 针对校招场景的特别建议
   - 常见错误和改进方法

【输出格式】
请按以下JSON格式输出：

```json
{
  "score": 85,
  "summary": "简历整体评价（2-3句话）",
  "strengths": ["优点1", "优点2", "优点3"],
  "improvements": [
    {
      "section": "工作经历",
      "issue": "描述过于笼统，缺乏具体成果",
      "suggestion": "建议使用STAR法则，添加量化的成果数据，如'提升了XX%'"
    },
    {
      "section": "技能",
      "issue": "技能描述不够具体",
      "suggestion": "建议标注熟练程度，并补充与目标岗位相关的技能"
    }
  ],
  "action_items": ["立即修改项1", "建议优化项2", "长期提升项3"]
}
```

**重要：**
- 评分范围 0-100
- 建议要具体、可操作
- 语气要鼓励且专业
- 只输出 JSON，不要有其他说明文字
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

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List
import jwt
from datetime import datetime, timedelta

# 导入数据库模块
from database import (
    init_database, create_user, authenticate_user, get_user_by_id,
    save_resume, get_user_resumes, get_resume_by_id, update_resume, delete_resume
)

# JWT 配置
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

app = FastAPI(title="CVFiller 简历解析服务")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化数据库
@app.on_event("startup")
async def startup_event():
    init_database()


# ========== Pydantic 模型 ==========

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ResumeData(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    education: str = ""
    experience: str = ""
    campusExperience: str = ""
    skills: str = ""


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


# ========== 认证依赖 ==========

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建 JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(authorization: Optional[str] = Header(None)):
    """获取当前登录用户"""
    if not authorization:
        raise HTTPException(status_code=401, detail="未提供认证信息")
    
    try:
        # 支持 "Bearer token" 格式
        token = authorization.replace("Bearer ", "") if "Bearer " in authorization else authorization
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="无效的认证信息")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="无效的认证信息")
    
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="用户不存在")
    
    return user


# ========== 用户认证 API ==========

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """用户注册"""
    try:
        user = create_user(user_data.username, user_data.email, user_data.password)
        access_token = create_access_token(data={"sub": user["id"]})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """用户登录"""
    user = authenticate_user(credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    
    access_token = create_access_token(data={"sub": user["id"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """获取当前用户信息"""
    return {"status": "success", "user": current_user}


# ========== 简历管理 API ==========

@app.post("/api/resumes")
async def create_resume(
    resume_data: ResumeData,
    current_user: dict = Depends(get_current_user)
):
    """保存简历数据"""
    resume_id = save_resume(current_user["id"], resume_data.dict())
    return {"status": "success", "id": resume_id, "message": "简历保存成功"}


@app.get("/api/resumes")
async def list_resumes(current_user: dict = Depends(get_current_user)):
    """获取用户的简历列表"""
    resumes = get_user_resumes(current_user["id"])
    return {"status": "success", "resumes": resumes}


@app.get("/api/resumes/{resume_id}")
async def get_resume(
    resume_id: int,
    current_user: dict = Depends(get_current_user)
):
    """获取单个简历详情"""
    resume = get_resume_by_id(resume_id, current_user["id"])
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    return {"status": "success", "resume": resume}


@app.put("/api/resumes/{resume_id}")
async def update_resume_api(
    resume_id: int,
    resume_data: ResumeData,
    current_user: dict = Depends(get_current_user)
):
    """更新简历数据"""
    success = update_resume(resume_id, current_user["id"], resume_data.dict())
    if not success:
        raise HTTPException(status_code=404, detail="简历不存在或无权限")
    return {"status": "success", "message": "简历更新成功"}


@app.delete("/api/resumes/{resume_id}")
async def delete_resume_api(
    resume_id: int,
    current_user: dict = Depends(get_current_user)
):
    """删除简历"""
    success = delete_resume(resume_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="简历不存在或无权限")
    return {"status": "success", "message": "简历删除成功"}

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
        import traceback
        print(f"[ERROR] Parse resume failed: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/resume-advice")
async def api_resume_advice(file: UploadFile = File(...)):
    """
    简历修改建议 API 端点
    """
    import traceback
    
    allowed_extensions = {'.pdf', '.docx', '.doc'}
    file_extension = Path(file.filename).suffix.lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"不支持的文件格式。请上传: {', '.join(allowed_extensions)}"
        )
    
    try:
        print(f"[DEBUG] 收到简历建议请求: {file.filename}")
        
        # 读取文件内容
        contents = await file.read()
        print(f"[DEBUG] 文件大小: {len(contents)} bytes")
        
        # 提取简历文本
        file_extension = Path(file.filename).suffix.lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
            tmp_file.write(contents)
            tmp_path = tmp_file.name
        
        resume_text = ""
        try:
            resume_text = extract_text_from_file(tmp_path)
            resume_text = preprocess_text(resume_text)
            print(f"[DEBUG] 提取文本长度: {len(resume_text)} 字符")
        finally:
            os.unlink(tmp_path)
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="无法从简历中提取文本")
        
        # 调用 AI 生成建议
        print("[DEBUG] 开始调用 AI 生成建议...")
        advice = generate_resume_advice(resume_text)
        print("[DEBUG] AI 建议生成成功")
        
        return {
            "status": "success",
            "source_file": file.filename,
            "advice": advice
        }
        
    except Exception as e:
        error_msg = f"[ERROR] 简历建议生成失败: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "CVFiller Resume Parser"}


def preprocess_text(text: str) -> str:
    """
    预处理简历文本，清理和格式化
    """
    # 移除多余空白字符
    text = ' '.join(text.split())
    # 移除特殊字符
    text = text.replace('\x00', '')
    return text


def generate_resume_advice(resume_text: str) -> Dict[str, Any]:
    """
    使用 AI 生成简历修改建议
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {AI_API_KEY}"
    }
    
    payload = {
        "model": "hunyuan-lite",
        "messages": [
            {
                "role": "system",
                "content": RESUME_ADVICE_PROMPT
            },
            {
                "role": "user",
                "content": f"请分析以下简历并提供修改建议：\n\n---简历开始---\n{resume_text}\n---简历结束---"
            }
        ],
        "temperature": 0.3,
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
        
        if "choices" in result and len(result["choices"]) > 0:
            generated_text = result["choices"][0]["message"]["content"]
            
            # 解析 JSON
            try:
                advice_data = json.loads(generated_text)
                return advice_data
            except json.JSONDecodeError as e:
                # 尝试清理后重新解析
                cleaned_text = generated_text.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3]
                return json.loads(cleaned_text.strip())
        else:
            raise Exception("API 返回结果异常")
            
    except Exception as e:
        print(f"生成建议错误: {e}")
        raise


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
