import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password } = req.body;
      const data = await this.authService.login(phone, password);
      return res.status(200).json({ status: 200, data });
    } catch (err) {
      next(err);
    }
  }
}
