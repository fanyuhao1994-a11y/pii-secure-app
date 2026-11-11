# Stage 1: Build & Compile
FROM node:20-alpine AS builder

WORKDIR /app

# 1. 安装 node-gyp 编译 argon2 所需的基础工具集
RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# 2. 裁剪开发依赖，只保留生产运行所需的原生模块
RUN npm prune --omit=dev && npm cache clean --force

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 3. 直接从 builder 阶段拷贝编译好的原生依赖和 JS 构建产物（无需在 runner 安装编译工具）
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# 切换非 root 用户
USER node

EXPOSE 3000

CMD ["node", "dist/app.js"]