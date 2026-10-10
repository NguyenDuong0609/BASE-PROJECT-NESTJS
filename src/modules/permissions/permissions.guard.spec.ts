import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
	const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
	const permissions = {
		hasAll: jest.fn(),
	} as unknown as jest.Mocked<PermissionsService>;
	const guard = new PermissionsGuard(reflector, permissions);
	const context = (user: unknown) =>
		({
			getHandler: jest.fn(),
			getClass: jest.fn(),
			switchToHttp: () => ({ getRequest: () => ({ user }) }),
		}) as unknown as ExecutionContext;

	beforeEach(() => jest.clearAllMocks());

	it('allows routes with no permission requirement', async () => {
		(reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
		await expect(guard.canActivate(context(undefined))).resolves.toBe(true);
		expect(permissions.hasAll).not.toHaveBeenCalled();
	});

	it('checks all declared permissions against the persisted role grants', async () => {
		(reflector.getAllAndOverride as jest.Mock).mockReturnValue([
			'flash-cards:update',
		]);
		(permissions.hasAll as jest.Mock).mockResolvedValue(true);
		await expect(
			guard.canActivate(context({ role: { id: 'role-id' } })),
		).resolves.toBe(true);
		expect(permissions.hasAll).toHaveBeenCalledWith('role-id', [
			'flash-cards:update',
		]);
	});

	it('forbids missing grants and users without a persisted role id', async () => {
		(reflector.getAllAndOverride as jest.Mock).mockReturnValue([
			'flash-cards:delete',
		]);
		(permissions.hasAll as jest.Mock).mockResolvedValue(false);
		await expect(
			guard.canActivate(context({ role: { id: 'role-id' } })),
		).rejects.toBeInstanceOf(ForbiddenException);
		await expect(
			guard.canActivate(context({ role: 'Admin' })),
		).rejects.toBeInstanceOf(ForbiddenException);
	});
});
