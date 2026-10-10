import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesService } from '@modules/user-roles/user-roles.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
	let service: UsersService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UsersService,
				{ provide: 'UsersRepositoryInterface', useValue: {} },
				{ provide: UserRolesService, useValue: {} },
			],
		}).compile();

		service = module.get<UsersService>(UsersService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
