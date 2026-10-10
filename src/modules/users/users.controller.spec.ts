import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { createAutoMock, createUserStub } from '@test-utils';
import { ForbiddenException } from '@nestjs/common';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { AuditLogService } from '../../observability/audit-log.service';
import { DataSource } from 'typeorm';

describe('UsersController', () => {
	let controller: UsersController;
	let service: jest.Mocked<UsersService>;

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			controllers: [UsersController],
			providers: [
				{
					provide: UsersService,
					useValue: createAutoMock<UsersService>(UsersService),
				},
				{
					provide: AuditLogService,
					useValue: { recordEvent: jest.fn() },
				},
				{
					provide: DataSource,
					useValue: { transaction: jest.fn() },
				},
			],
		}).compile();

		controller = module.get<UsersController>(UsersController);
		service = module.get(UsersService);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('findAll', () => {
		it('should return paginated users', async () => {
			service.findAll = jest
				.fn()
				.mockResolvedValue({ items: [createUserStub()], total: 1 });
			const result = await controller.findAll(1, 10);
			expect(result.items).toHaveLength(1);
		});
	});

	describe('findOne', () => {
		it('should return single user', async () => {
			const user = createUserStub();
			service.findOne = jest.fn().mockResolvedValue(user);
			const request = { user } as never;
			const result = await controller.findOne(user.id, request);
			expect(result).toEqual(user);
		});

		it('denies reads of another user’s account', async () => {
			await expect(
				controller.findOne('target-user', {
					user: { id: 'requesting-user', role: { name: USER_ROLE.USER } },
				} as never),
			).rejects.toBeInstanceOf(ForbiddenException);
			expect(service.findOne).not.toHaveBeenCalled();
		});

		it('allows admins to read another user’s account', async () => {
			service.findOne = jest.fn().mockResolvedValue({ id: 'target-user' });

			await expect(
				controller.findOne('target-user', {
					user: { id: 'admin-user', role: { name: USER_ROLE.ADMIN } },
				} as never),
			).resolves.toEqual({ id: 'target-user' });
		});
	});
});
