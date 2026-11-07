import { Router } from 'express';
import { authenticate, requireAdmin, requireOwner } from '../../middlewares/authenticate';
import { getDashboard, updateUserRole } from './admin.controller';

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);
adminRouter.get('/dashboard', getDashboard);
adminRouter.patch('/users/:userId/role', requireOwner, updateUserRole);
