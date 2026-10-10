import { ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Checkin } from './entities/checkin.entity';
import { CheckinStats } from './entities/checkin-stats.entity';
import { CheckinService } from './checkin.service';
import { User } from '@modules/users/entities/user.entity';

describe('CheckinService', () => {
	let service: CheckinService;
	let checkinRepository: jest.Mocked<Repository<Checkin>>;
	let statsRepository: jest.Mocked<Repository<CheckinStats>>;
	let transactionManager: { getRepository: jest.Mock };
	let transaction: jest.Mock;

	beforeEach(() => {
		checkinRepository = {
			create: jest.fn((value) => ({ ...value, id: 'checkin-id' })),
			save: jest.fn(async (value) => value),
			findOne: jest.fn(),
			findAndCount: jest.fn(),
		} as unknown as jest.Mocked<Repository<Checkin>>;
		statsRepository = {
			create: jest.fn((value) => ({ ...value })),
			save: jest.fn(async (value) => value),
			findOne: jest.fn(),
		} as unknown as jest.Mocked<Repository<CheckinStats>>;
		transactionManager = {
			getRepository: jest.fn((entity) =>
				entity === Checkin ? checkinRepository : statsRepository,
			),
		};
		transaction = jest.fn((_isolation, callback) =>
			callback(transactionManager),
		);
		const dataSource = {
			manager: { transaction },
		} as unknown as DataSource;
		service = new CheckinService(
			checkinRepository,
			statsRepository,
			dataSource,
			{ recordEvent: jest.fn().mockResolvedValue(undefined) } as never,
		);
	});

	it('creates a first daily check-in and initializes streak and reward stats', async () => {
		checkinRepository.findOne.mockResolvedValue(null);
		statsRepository.findOne.mockResolvedValue(null);

		const result = await service.performCheckin('user-id');

		expect(result.isNewStreak).toBe(true);
		expect(result.stats).toMatchObject({
			totalCheckins: 1,
			currentStreak: 1,
			longestStreak: 1,
			totalRewards: 11,
		});
		expect(result.checkin).toMatchObject({
			userId: 'user-id',
			streakCount: 1,
			rewardsEarned: 11,
		});
		expect(transaction).toHaveBeenCalledWith(
			'SERIALIZABLE',
			expect.any(Function),
		);
	});

	it('rejects a second check-in on the same day', async () => {
		checkinRepository.findOne.mockResolvedValue({
			id: 'already-checked-in',
		} as Checkin);

		await expect(service.performCheckin('user-id')).rejects.toBeInstanceOf(
			ConflictException,
		);
	});

	it('continues the streak when PostgreSQL returns the last date as a string', async () => {
		checkinRepository.findOne.mockResolvedValue(null);
		const yesterday = new Date();
		yesterday.setHours(0, 0, 0, 0);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayAsSqlDate = [
			yesterday.getFullYear(),
			String(yesterday.getMonth() + 1).padStart(2, '0'),
			String(yesterday.getDate()).padStart(2, '0'),
		].join('-');
		statsRepository.findOne.mockResolvedValue({
			userId: 'user-id',
			user: { id: 'user-id' } as User,
			totalCheckins: 2,
			currentStreak: 2,
			longestStreak: 2,
			totalRewards: 24,
			lastCheckinDate: yesterdayAsSqlDate,
		} as CheckinStats);

		const result = await service.performCheckin('user-id');

		expect(result.isNewStreak).toBe(false);
		expect(result.stats.currentStreak).toBe(3);
	});

	it('returns check-in history with limit and offset metadata', async () => {
		checkinRepository.findAndCount.mockResolvedValue([
			[{ id: 'checkin-id' } as Checkin],
			1,
		]);

		await expect(service.getCheckinHistory('user-id', 10, 5)).resolves.toEqual({
			items: [{ id: 'checkin-id' }],
			total: 1,
			limit: 10,
			offset: 5,
		});
	});
});
