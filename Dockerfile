# CVFiller 全栈应用 Dockerfile
# 前端构建 + 后端服务

FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖
COPY package*.json ./
RUN npm ci

# 复制前端源码并构建
COPY . .
RUN npm run build

# Python 后端基础镜像
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制后端依赖
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ ./backend/

# 从前端构建阶段复制构建产物
COPY --from=frontend-builder /app/dist ./dist

# 创建数据目录
RUN mkdir -p /app/data

# 设置环境变量
ENV DATABASE_PATH=/app/data/cvfiller.db
ENV SECRET_KEY=your-production-secret-key-change-this
ENV PORT=8080

# 暴露端口（不使用 80）
EXPOSE 8080

# 启动命令
WORKDIR /app/backend
CMD ["uvicorn", "resume_parser:app", "--host", "0.0.0.0", "--port", "8080"]
