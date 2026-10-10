import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { RequestWithTenant } from '../types/requests.type';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
	use(req: RequestWithTenant, res: Response, next: NextFunction) {
		const tenantId = req.headers['x-tenant-id'] as string;
		if (tenantId) {
			req.tenantId = tenantId;
		}
		next();
	}
}
