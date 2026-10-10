import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';
import { AuditLogService } from '../../observability/audit-log.service';
import { DataSource } from 'typeorm';

describe('UserRolesController', () => {
	let controller: UserRolesController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [UserRolesController],
			providers: [
				{ provide: UserRolesService, useValue: {} },
				{ provide: AuditLogService, useValue: { recordEvent: jest.fn() } },
				{ provide: DataSource, useValue: { transaction: jest.fn() } },
			],
		}).compile();

		controller = module.get<UserRolesController>(UserRolesController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
