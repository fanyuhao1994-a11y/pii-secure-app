FROM node:20-alpine

WORKDIR /app

# 1. 安装 argon2 / node-gyp 编译 C++ 原生模块所需的构建工具
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# 2. 仅安装生产环境依赖
RUN npm ci --only=production

# 3. 复制编译产物
COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/app.js"]