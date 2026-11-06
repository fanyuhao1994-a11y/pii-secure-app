FROM node:22-alpine

WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production

# 1. 仅复制依赖定义文件，只安装生产依赖（只留 node_modules 必要的包）
COPY package*.json ./
RUN npm ci --only=production

# 2. 直接复制 CI 宿主机（Runner）上已经编译好的 dist 产物
COPY dist ./dist

# 3. 暴露服务端口（根据项目实际情况调整，默认 3000）
EXPOSE 3000

# 4. 启动应用
CMD ["node", "dist/app.js"]