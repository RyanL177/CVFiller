"""
数据库模块 - SQLite 轻量级数据库
支持用户管理和简历数据持久化
"""

import os
import sqlite3
import hashlib
import secrets
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import contextmanager

DATABASE_PATH = os.environ.get("DATABASE_PATH", "./data/cvfiller.db")


def init_database():
    """初始化数据库表结构"""
    # 确保数据目录存在
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    with get_db() as db:
        # 用户表
        db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 简历数据表
        db.execute('''
            CREATE TABLE IF NOT EXISTS resumes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT,
                email TEXT,
                phone TEXT,
                education TEXT,
                experience TEXT,
                campus_experience TEXT,
                skills TEXT,
                source_filename TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # 创建索引
        db.execute('CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        
        db.commit()
        print(f"[DB] 数据库初始化完成: {DATABASE_PATH}")


@contextmanager
def get_db():
    """获取数据库连接上下文管理器"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def hash_password(password: str, salt: Optional[str] = None) -> tuple:
    """密码哈希，返回 (hash, salt)"""
    if salt is None:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return pwd_hash.hex(), salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """验证密码"""
    computed_hash, _ = hash_password(password, salt)
    return computed_hash == password_hash


# ========== 用户相关操作 ==========

def create_user(username: str, email: str, password: str) -> Dict[str, Any]:
    """创建新用户"""
    password_hash, salt = hash_password(password)
    
    with get_db() as db:
        try:
            cursor = db.execute(
                '''INSERT INTO users (username, email, password_hash, salt)
                   VALUES (?, ?, ?, ?)''',
                (username, email, password_hash, salt)
            )
            db.commit()
            
            return {
                "id": cursor.lastrowid,
                "username": username,
                "email": email,
                "created_at": datetime.now().isoformat()
            }
        except sqlite3.IntegrityError as e:
            if "username" in str(e).lower():
                raise ValueError("用户名已被使用")
            elif "email" in str(e).lower():
                raise ValueError("邮箱已被注册")
            raise ValueError("用户已存在")


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """通过邮箱获取用户"""
    with get_db() as db:
        row = db.execute(
            'SELECT * FROM users WHERE email = ?',
            (email,)
        ).fetchone()
        
        if row:
            return dict(row)
        return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """通过 ID 获取用户"""
    with get_db() as db:
        row = db.execute(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            (user_id,)
        ).fetchone()
        
        if row:
            return dict(row)
        return None


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """验证用户登录"""
    user = get_user_by_email(email)
    if not user:
        return None
    
    if verify_password(password, user["password_hash"], user["salt"]):
        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "created_at": user["created_at"]
        }
    return None


# ========== 简历数据相关操作 ==========

def save_resume(user_id: int, resume_data: Dict[str, Any], source_filename: str = None) -> int:
    """保存简历数据"""
    with get_db() as db:
        cursor = db.execute('''
            INSERT INTO resumes 
            (user_id, name, email, phone, education, experience, campus_experience, skills, source_filename)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            resume_data.get("name", ""),
            resume_data.get("email", ""),
            resume_data.get("phone", ""),
            resume_data.get("education", ""),
            resume_data.get("experience", ""),
            resume_data.get("campusExperience", ""),
            resume_data.get("skills", ""),
            source_filename
        ))
        db.commit()
        return cursor.lastrowid


def update_resume(resume_id: int, user_id: int, resume_data: Dict[str, Any]) -> bool:
    """更新简历数据"""
    with get_db() as db:
        cursor = db.execute('''
            UPDATE resumes SET
                name = ?,
                email = ?,
                phone = ?,
                education = ?,
                experience = ?,
                campus_experience = ?,
                skills = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        ''', (
            resume_data.get("name", ""),
            resume_data.get("email", ""),
            resume_data.get("phone", ""),
            resume_data.get("education", ""),
            resume_data.get("experience", ""),
            resume_data.get("campusExperience", ""),
            resume_data.get("skills", ""),
            resume_id,
            user_id
        ))
        db.commit()
        return cursor.rowcount > 0


def get_user_resumes(user_id: int) -> List[Dict[str, Any]]:
    """获取用户的所有简历"""
    with get_db() as db:
        rows = db.execute('''
            SELECT id, name, email, phone, source_filename, created_at, updated_at
            FROM resumes WHERE user_id = ? ORDER BY updated_at DESC
        ''', (user_id,)).fetchall()
        
        return [dict(row) for row in rows]


def get_resume_by_id(resume_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """获取单条简历详情"""
    with get_db() as db:
        row = db.execute('''
            SELECT * FROM resumes WHERE id = ? AND user_id = ?
        ''', (resume_id, user_id)).fetchone()
        
        if row:
            return dict(row)
        return None


def delete_resume(resume_id: int, user_id: int) -> bool:
    """删除简历"""
    with get_db() as db:
        cursor = db.execute(
            'DELETE FROM resumes WHERE id = ? AND user_id = ?',
            (resume_id, user_id)
        )
        db.commit()
        return cursor.rowcount > 0
