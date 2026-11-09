# -----------------------------
# 阶段 1: 编译阶段 (Builder)
# -----------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# 安装完整依赖（包含 typescript 等 devDependencies）
COPY package*.json ./
RUN npm ci

# 复制源码并运行编译，自动在容器内生成 /app/dist 目录
COPY . .
RUN npm run build

# -----------------------------
# 阶段 2: 生产运行阶段 (Runner)
# -----------------------------
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# 仅安装生产所需依赖
RUN npm ci --only=production

# 从阶段 1 将编译好的 dist 目录复制过来
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/app.js"]