import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesService } from './user-roles.service';

describe('UserRolesService', () => {
	let service: UserRolesService;
	const userRolesRepository = {
		removeIfUnassigned: jest.fn(),
	};

	beforeEach(async () => {
		jest.clearAllMocks();
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UserRolesService,
				{
					provide: 'UserRolesRepositoryInterface',
					useValue: userRolesRepository,
				},
			],
		}).compile();

		service = module.get<UserRolesService>(UserRolesService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('should delegate deletion to the usage-aware repository method', async () => {
		userRolesRepository.removeIfUnassigned.mockResolvedValue(true);

		await expect(service.remove('role-id')).resolves.toBe(true);
		expect(userRolesRepository.removeIfUnassigned).toHaveBeenCalledWith(
			'role-id',
		);
	});
});
