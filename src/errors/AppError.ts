export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// 常见快捷异常派生类
export class NotFoundError extends AppError {
  constructor(message = '请求的资源不存在') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '未授权或 Token 已失效') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '权限不足，拒绝访问') {
    super(message, 403);
  }
}