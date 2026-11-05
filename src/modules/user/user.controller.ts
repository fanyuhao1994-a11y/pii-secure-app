import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { AppError, NotFoundError } from '../../errors/AppError';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // 1. 用户注册
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.userService.createUser(req.body);
      return res.status(201).json({ status: 201, data: user });
    } catch (err) {
      next(err); // 投递给全局错误处理中间件
    }
  }

  // 2. 获取个人档案
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const operator = (req as any).user;
      const user = await this.userService.getUserById(operator.id, operator);

      if (!user) {
        throw new NotFoundError('用户不存在');
      }

      return res.status(200).json({ status: 200, data: user });
    } catch (err) {
      next(err);
    }
  }

  // 3. 盲索引精确搜索
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const phone = req.query.phone as string;
      if (!phone) {
        throw new AppError('缺少 phone 查询参数', 400);
      }

      const operator = (req as any).user;
      const user = await this.userService.searchUserByPhone(phone, operator);

      if (!user) {
        throw new NotFoundError('未找到对应用户');
      }

      return res.status(200).json({ status: 200, data: user });
    } catch (err) {
      next(err);
    }
  }
}