# Step 1: 构建阶段 (Build Stage)
FROM node:20-alpine AS builder
WORKDIR /app

# 安装 C/C++ 编译依赖（专治 argon2 / node-gyp 等原生模块）
RUN apk add --no-cache python3 make g++

# 复制依赖文件并安装全量依赖
COPY package*.json ./
RUN npm ci

# 复制源码并编译 TypeScript
COPY . .
RUN npm run build

# 剪裁依赖：删除 devDependencies，仅保留生产环境所需的底层 node_modules
RUN npm prune --production

# Step 2: 运行阶段 (Runner Stage)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 直接从 builder 阶段复制已经编译好的生产 node_modules 和 dist 产物
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/app.js"]