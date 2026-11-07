# 阶段 1：构建阶段（包含 C++ 原生模块编译工具）
FROM node:20-alpine AS builder

WORKDIR /app

# 仅在构建阶段安装编译 argon2 所需的工具
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

# 阶段 2：最终生产运行镜像（极致干净，无 python/make/g++）
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
# 从 builder 阶段仅复制编译好的 node_modules 目录
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/app.js"]