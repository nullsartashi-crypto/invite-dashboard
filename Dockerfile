# 使用 Node.js 18 作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 文件
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# 安装后端依赖
WORKDIR /app/backend
RUN npm install --production

# 安装前端依赖并构建
WORKDIR /app/frontend
RUN npm install
COPY frontend/ ./
RUN npm run build

# 复制后端代码
WORKDIR /app/backend
COPY backend/ ./

# 创建目录用于存放前端构建文件
RUN mkdir -p /app/backend/public

# 复制前端构建文件到后端 public 目录
RUN cp -r /app/frontend/dist/* /app/backend/public/

# 暴露端口（Railway 会自动设置 PORT 环境变量）
EXPOSE 3000

# 设置工作目录为后端
WORKDIR /app/backend

# 启动命令
CMD ["node", "app.js"]
