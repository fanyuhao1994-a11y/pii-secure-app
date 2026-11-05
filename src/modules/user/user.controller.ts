import { Request, Response } from 'express';
import { UserService } from './user.service';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async register(req: Request, res: Response) {
    try {
      const user = await this.userService.createUser(req.body);
      return res.status(201).json({ status: 201, data: user });
    } catch (err: any) {
      return res.status(500).json({ status: 500, error: err.message });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const operator = (req as any).user;
      const user = await this.userService.getUserById(operator.id, operator);
      return res.status(200).json({ status: 200, data: user });
    } catch (err: any) {
      return res.status(500).json({ status: 500, error: err.message });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const phone = req.query.phone as string;
      if (!phone) {
        return res.status(400).json({ status: 400, message: '缺少 phone 查询参数' });
      }

      const operator = (req as any).user;
      const user = await this.userService.searchUserByPhone(phone, operator);

      if (!user) {
        return res.status(404).json({ status: 404, message: '未找到对应用户' });
      }

      return res.status(200).json({ status: 200, data: user });
    } catch (err: any) {
      return res.status(500).json({ status: 500, error: err.message });
    }
  }
}