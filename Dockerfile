# -----------------------------
# 阶段 1: 编译阶段 (Builder)
# -----------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# 安装 argon2 等原生 C++ 模块编译所需的构建工具
RUN apk add --no-cache python3 make g++

# 复制依赖定义并安装全部依赖
COPY package*.json ./
RUN npm ci

# 复制项目源码并编译 TypeScript (生成 ./dist)
COPY . .
RUN npm run build

# 清理 devDependencies，仅保留生产依赖及已编译好的 native node_modules
RUN npm prune --omit=dev

# -----------------------------
# 阶段 2: 生产运行阶段 (Runner)
# -----------------------------
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# 直接从 builder 阶段复制编译好的生产依赖与产物，避免在 Runner 阶段二次编译
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/app.js"]