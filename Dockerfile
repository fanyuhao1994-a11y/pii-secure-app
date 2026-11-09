# -----------------------------
# 1. 构建阶段 (Build Stage)
# -----------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源码并执行构建，生成 ./dist 目录
COPY . .
RUN npm run build

# -----------------------------
# 2. 运行阶段 (Production Stage)
# -----------------------------
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# 仅安装生产环境依赖
RUN npm ci --only=production

# 从 builder 阶段将生成的 dist 目录复制过来
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/app.js"]