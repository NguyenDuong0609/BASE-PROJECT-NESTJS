import { Injectable, ConflictException, Optional } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Checkin } from './entities/checkin.entity';
import { CheckinStats } from './entities/checkin-stats.entity';
import { User } from '@modules/users/entities/user.entity';
import { AuditLogService } from '../../observability/audit-log.service';
import { createContextLogger } from '../../configs/logger.config';

export interface CheckinResult {
	checkin: Checkin;
	stats: CheckinStats;
	isNewStreak: boolean;
}

@Injectable()
export class CheckinService {
	private readonly logger: PinoLogger;

	constructor(
		@InjectRepository(Checkin)
		private readonly checkinRepository: Repository<Checkin>,
		@InjectRepository(CheckinStats)
		private readonly statsRepository: Repository<CheckinStats>,
		private readonly dataSource: DataSource,
		private readonly auditLog: AuditLogService,
		@Optional() logger?: PinoLogger,
	) {
		this.logger = createContextLogger(CheckinService.name, logger);
	}

	async performCheckin(userId: string): Promise<CheckinResult> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return this.dataSource.manager.transaction(
			'SERIALIZABLE',
			async (manager) => {
				const checkinRepo = manager.getRepository(Checkin);
				const statsRepo = manager.getRepository(CheckinStats);

				const existingCheckin = await checkinRepo.findOne({
					where: {
						userId,
						checkinDate: today,
					},
				});

				if (existingCheckin) {
					throw new ConflictException('Already checked in today');
				}

				let stats = await statsRepo.findOne({
					where: { user: { id: userId } },
					lock: { mode: 'pessimistic_write' },
				});

				if (!stats) {
					stats = statsRepo.create({
						userId,
						user: { id: userId } as User,
						totalCheckins: 0,
						currentStreak: 0,
						longestStreak: 0,
						totalRewards: 0,
					});
				}

				const yesterday = new Date(today);
				yesterday.setDate(yesterday.getDate() - 1);

				let newStreak: number;
				if (
					stats.lastCheckinDate &&
					this.isSameDay(stats.lastCheckinDate, yesterday)
				) {
					newStreak = stats.currentStreak + 1;
				} else {
					newStreak = 1;
				}

				const rewards = this.calculateRewards(newStreak);

				const checkin = checkinRepo.create({
					userId,
					user: { id: userId } as User,
					checkinDate: today,
					streakCount: newStreak,
					rewardsEarned: rewards,
					metadata: {
						checkinTime: new Date().toISOString(),
					},
				});

				await checkinRepo.save(checkin);

				stats.totalCheckins += 1;
				stats.currentStreak = newStreak;
				stats.longestStreak = Math.max(stats.longestStreak, newStreak);
				stats.totalRewards += rewards;
				stats.lastCheckinDate = today;

				await statsRepo.save(stats);
				await this.auditLog.recordEvent(
					{
						eventType: 'business',
						action: 'CHECKIN_RECORDED',
						actorUserId: userId,
						subjectUserId: userId,
						resourceType: 'Checkin',
						resourceId: checkin.id,
						metadata: { streakCount: newStreak, rewardsEarned: rewards },
					},
					manager,
				);

				this.logger.info(
					{ userId, streak: newStreak, rewards },
					'User checked in',
				);

				return {
					checkin,
					stats,
					isNewStreak: newStreak === 1,
				};
			},
		);
	}

	async getCheckinHistory(userId: string, limit = 30, offset = 0) {
		const [items, total] = await this.checkinRepository.findAndCount({
			where: { userId },
			order: { checkinDate: 'DESC' },
			skip: offset,
			take: limit,
		});

		return {
			items,
			total,
			limit,
			offset,
		};
	}

	async getCheckinStats(userId: string): Promise<CheckinStats> {
		let stats = await this.statsRepository.findOne({
			where: { user: { id: userId } },
		});

		if (!stats) {
			stats = this.statsRepository.create({
				userId,
				user: { id: userId } as User,
				totalCheckins: 0,
				currentStreak: 0,
				longestStreak: 0,
				totalRewards: 0,
			});
			await this.statsRepository.save(stats);
		}

		return stats;
	}

	async getCheckinStatus(userId: string) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const todayCheckin = await this.checkinRepository.findOne({
			where: {
				userId,
				checkinDate: today,
			},
		});

		const stats = await this.getCheckinStats(userId);

		return {
			hasCheckedInToday: !!todayCheckin,
			currentStreak: stats.currentStreak,
			nextReward: this.calculateRewards(stats.currentStreak + 1),
			todayCheckin,
		};
	}

	private calculateRewards(streak: number): number {
		const baseReward = 10;
		const streakBonus = Math.floor(streak / 7) * 5;
		const dailyBonus = Math.min(streak, 30);

		return baseReward + streakBonus + dailyBonus;
	}

	private isSameDay(date1: Date | string, date2: Date): boolean {
		const normalizedDate =
			typeof date1 === 'string' ? new Date(`${date1}T00:00:00`) : date1;

		return (
			normalizedDate.getFullYear() === date2.getFullYear() &&
			normalizedDate.getMonth() === date2.getMonth() &&
			normalizedDate.getDate() === date2.getDate()
		);
	}
}
