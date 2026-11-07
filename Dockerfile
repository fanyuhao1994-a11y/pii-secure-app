# 切换为基于 Alpine 的安全瘦身镜像
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# 仅安装生产依赖
RUN npm ci --only=production

# 复制编译产物
COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]