import { Router } from 'express';
import { authRateLimiter, recoveryRateLimiter } from '../../middlewares/rateLimiter';
import { authenticate } from '../../middlewares/authenticate';
import {
  register,
  login,
  refreshTokens,
  logout,
  logoutAll,
  getMe,
  updateMe,
  changePassword,
  recoverPassword,
  rotateRecoveryKey,
} from './auth.controller';

export const authRouter = Router();

// Public endpoints — rate-limited
authRouter.post('/register', authRateLimiter, register);
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/refresh', refreshTokens);
authRouter.post('/recover-password', recoveryRateLimiter, recoverPassword);
authRouter.post('/recover', recoveryRateLimiter, recoverPassword);

// Authenticated endpoints
authRouter.post('/logout', authenticate, logout);
authRouter.post('/logout-all', authenticate, logoutAll);
authRouter.get('/me', authenticate, getMe);
authRouter.patch('/me', authenticate, updateMe);
authRouter.patch('/password', authenticate, changePassword);
authRouter.post('/recovery-key/rotate', authenticate, rotateRecoveryKey);
