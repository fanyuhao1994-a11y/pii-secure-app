# Step 1: 构建阶段 (Build Stage)
FROM node:20-alpine AS builder
WORKDIR /app

# 复制依赖配置并安装全量依赖
COPY package*.json ./
RUN npm ci

# 复制源码并编译 TypeScript
COPY . .
RUN npm run build

# Step 2: 运行阶段 (Runner Stage)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 只安装生产环境所需的依赖
COPY package*.json ./
RUN npm ci --only=production

# 从构建阶段复制编译后的产物
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# 启动编译后的 JS 入口
CMD ["node", "dist/app.js"]