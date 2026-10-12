import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiBearerAuth,
	ApiQuery,
} from '@nestjs/swagger';
import { CheckinService } from './checkin.service';
import { CurrentUserId } from 'src/decorators/current-user.decorator';
import { JwtAccessTokenGuard } from '@modules/auth/guards/jwt-access-token.guard';
import { ApiSuccessMessage } from 'src/decorators/api-success-message.decorator';
import { FeatureFlag } from '../../decorators/feature-flag.decorator';

@ApiTags('Check-in')
@ApiBearerAuth('token')
@UseGuards(JwtAccessTokenGuard)
@Controller('checkin')
@FeatureFlag('checkin')
export class CheckinController {
	constructor(private readonly checkinService: CheckinService) {}

	@Post()
	@ApiSuccessMessage('CHECK_IN_RECORDED')
	@ApiOperation({ summary: 'Perform daily check-in' })
	async performCheckin(@CurrentUserId() userId: string) {
		return this.checkinService.performCheckin(userId);
	}

	@Get('history')
	@ApiOperation({ summary: 'Get check-in history' })
	@ApiQuery({ name: 'limit', required: false, type: Number, example: 30 })
	@ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
	async getHistory(@CurrentUserId() userId: string) {
		return this.checkinService.getCheckinHistory(userId);
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get check-in statistics' })
	async getStats(@CurrentUserId() userId: string) {
		return this.checkinService.getCheckinStats(userId);
	}

	@Get('status')
	@ApiOperation({ summary: 'Get today check-in status' })
	async getStatus(@CurrentUserId() userId: string) {
		return this.checkinService.getCheckinStatus(userId);
	}
}
