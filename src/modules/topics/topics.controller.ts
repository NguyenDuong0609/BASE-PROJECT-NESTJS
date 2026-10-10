import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseInterceptors,
	ClassSerializerInterceptor,
	ParseUUIDPipe,
	UseGuards,
} from '@nestjs/common';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Public } from 'src/decorators/auth.decorator';
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiTags,
	ApiBody,
} from '@nestjs/swagger';
import { JwtAccessTokenGuard } from '@modules/auth/guards/jwt-access-token.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { ApiSuccessMessage } from 'src/decorators/api-success-message.decorator';
import { FeatureFlag } from '../../decorators/feature-flag.decorator';

@Controller('topics')
@FeatureFlag('topics')
@ApiTags('topics')
// @UseGuards(JwtAccessTokenGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class TopicsController {
	constructor(private readonly topicsService: TopicsService) {}

	@Post()
	@ApiSuccessMessage('TOPIC_CREATED')
	@Roles(USER_ROLE.ADMIN)
	@UseGuards(JwtAccessTokenGuard, RolesGuard)
	@ApiBearerAuth('token')
	@ApiOperation({
		summary: 'Admin create topic',
	})
	@ApiBody({
		type: CreateTopicDto,
		examples: {
			topic_1: {
				value: {
					name: 'English Vocabulary',
					description: 'Common English words and phrases for everyday conversations',
				} as CreateTopicDto,
			},
			topic_2: {
				value: {
					name: 'Business English',
					description: 'Professional business terminology and expressions',
				} as CreateTopicDto,
			},
		},
	})
	create(@Body() createTopicDto: CreateTopicDto) {
		return this.topicsService.create(createTopicDto);
	}

	@Get()
	@Public()
	findAll() {
		return this.topicsService.findAll();
	}

	@Get(':id')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Topic UUID',
	})
	findOne(@Param('id', ParseUUIDPipe) id: string) {
		return this.topicsService.findOne(id);
	}

	@Patch(':id')
	@ApiSuccessMessage('TOPIC_UPDATED')
	@Roles(USER_ROLE.ADMIN)
	@UseGuards(JwtAccessTokenGuard, RolesGuard)
	@ApiBearerAuth('token')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Topic UUID',
	})
	update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateTopicDto: UpdateTopicDto,
	) {
		return this.topicsService.update(id, updateTopicDto);
	}

	@Delete(':id')
	@ApiSuccessMessage('TOPIC_DELETED')
	@Roles(USER_ROLE.ADMIN)
	@UseGuards(JwtAccessTokenGuard, RolesGuard)
	@ApiBearerAuth('token')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Topic UUID',
	})
	remove(@Param('id', ParseUUIDPipe) id: string) {
		return this.topicsService.remove(id);
	}
}
