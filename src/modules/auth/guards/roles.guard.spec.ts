import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import {
	createAutoMock,
	createUserRoleStub,
	createUserStub,
} from '@test-utils';
import { UserRole } from '@modules/user-roles/entities/user-role.entity';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';

describe('RolesGuard', () => {
	let guard: RolesGuard;
	let reflector: jest.Mocked<Reflector>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RolesGuard,
				{
					provide: Reflector,
					useValue: createAutoMock<Reflector>(Reflector),
				},
			],
		}).compile();

		guard = module.get<RolesGuard>(RolesGuard);
		reflector = module.get(Reflector);
	});

	it('should be defined', () => {
		expect(guard).toBeDefined();
	});

	describe('canActivate', () => {
		it('should allow access if no @Roles decorator present', () => {
			const mockContext = {
				getHandler: () => ({}),
				getClass: () => ({}),
				switchToHttp: () => ({
					getRequest: () => ({ user: createUserStub() }),
				}),
			} as ExecutionContext;

			reflector.getAllAndOverride = jest.fn().mockReturnValue(undefined);

			const result = guard.canActivate(mockContext);

			expect(result).toBe(true);
		});

		it('should allow access if user has required role', () => {
			const role = createUserRoleStub({ name: USER_ROLE.ADMIN }) as UserRole;
			const user = createUserStub({ role });
			const mockContext = {
				getHandler: () => ({}),
				getClass: () => ({}),
				switchToHttp: () => ({
					getRequest: () => ({ user }),
				}),
			} as ExecutionContext;

			reflector.getAllAndOverride = jest
				.fn()
				.mockReturnValue([USER_ROLE.ADMIN]);

			const result = guard.canActivate(mockContext);

			expect(result).toBe(true);
		});

		it('should deny access if user lacks required role', () => {
			const role = createUserRoleStub({ name: USER_ROLE.USER }) as UserRole;
			const user = createUserStub({ role });
			const mockContext = {
				getHandler: () => ({}),
				getClass: () => ({}),
				switchToHttp: () => ({
					getRequest: () => ({ user }),
				}),
			} as ExecutionContext;

			reflector.getAllAndOverride = jest
				.fn()
				.mockReturnValue([USER_ROLE.ADMIN]);

			expect(guard.canActivate(mockContext)).toBe(false);
		});

		it('requires an admin role when the route is restricted to admins', () => {
			const role = createUserRoleStub({ name: USER_ROLE.ADMIN }) as UserRole;
			const admin = createUserStub({ role });
			const mockContext = {
				getHandler: () => ({}),
				getClass: () => ({}),
				switchToHttp: () => ({
					getRequest: () => ({ user: admin }),
				}),
			} as ExecutionContext;

			reflector.getAllAndOverride = jest
				.fn()
				.mockReturnValue([USER_ROLE.ADMIN]);

			const result = guard.canActivate(mockContext);

			expect(result).toBe(true);
		});
	});
});
