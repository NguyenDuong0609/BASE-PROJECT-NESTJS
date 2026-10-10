import { Test } from '@nestjs/testing';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { createAutoMock } from '@test-utils';

describe('CheckinController', () => {
	let controller: CheckinController;
	let service: jest.Mocked<CheckinService>;

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			controllers: [CheckinController],
			providers: [
				{
					provide: CheckinService,
					useValue: createAutoMock<CheckinService>(CheckinService),
				},
			],
		}).compile();

		controller = module.get<CheckinController>(CheckinController);
		service = module.get(CheckinService);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('performCheckin', () => {
		it('should create checkin', async () => {
			service.performCheckin = jest.fn().mockResolvedValue({
				checkin: {
					id: 'checkin-id',
					streakCount: 1,
					rewardsEarned: 10,
				},
				stats: {},
				isNewStreak: true,
			});
			const result = await controller.performCheckin('1');
			expect(result).toBeDefined();
		});
	});

	describe('getHistory', () => {
		it('should return paginated history', async () => {
			service.getCheckinHistory = jest.fn().mockResolvedValue([]);
			const result = await controller.getHistory('1');
			expect(result).toEqual([]);
		});
	});
});
