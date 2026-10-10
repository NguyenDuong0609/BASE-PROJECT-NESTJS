import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseInterceptors,
	SerializeOptions,
	UseGuards,
	UploadedFiles,
	Query,
	ClassSerializerInterceptor,
	ParseUUIDPipe,
	NotImplementedException,
	ForbiddenException,
	BadRequestException,
	Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAccessTokenGuard } from '@modules/auth/guards/jwt-access-token.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import {
	ApiBearerAuth,
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiParam,
	ApiTags,
} from '@nestjs/swagger';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiDocsPagination } from 'src/decorators/swagger-form-data.decorator';
import { RequestWithUser } from 'src/types/requests.type';
import {
	MAX_UPLOAD_SIZE,
	multipleImageUploadOptions,
	validateFileSignature,
} from 'src/shared/upload-validation';
import { ApiSuccessMessage } from 'src/decorators/api-success-message.decorator';
import { FeatureFlag } from '../../decorators/feature-flag.decorator';
import { ParsePaginationPipe } from '@modules/shared/base/pipes/parse-pagination.pipe';
import { AuditLogService } from '../../observability/audit-log.service';
import { DataSource } from 'typeorm';
import { LANGUAGES } from './entities/user.entity';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth('token')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAccessTokenGuard)
export class UsersController {
	constructor(
		private readonly usersService: UsersService,
		private readonly auditLog: AuditLogService,
		private readonly dataSource: DataSource,
	) {}

	@Post()
	@ApiSuccessMessage('USER_CREATED')
	@Roles(USER_ROLE.ADMIN)
	@UseGuards(RolesGuard)
	@ApiOperation({
		summary: 'Admin create new user',
		description: `
* Only admin can use this API

* Admin create user and give some specific information`,
	})
	@ApiBody({
		type: CreateUserDto,
		examples: {
			user_1: {
				value: {
					first_name: 'Jane',
					last_name: 'Smith',
					email: 'janesmith@example.com',
					username: 'janesmith',
					password: 'ExamplePass123!',
					phone_number: '+14155552672',
					address: [
						{
							street: '456 Oak Avenue',
							state: 'New York',
							city: 'New York City',
							postal_code: 10001,
							country: 'United States',
						},
					],
					interested_languages: [LANGUAGES.ENGLISH, LANGUAGES.FRENCH],
				} as CreateUserDto,
			},
			user_2: {
				value: {
					first_name: 'Robert',
					last_name: 'Johnson',
					email: 'robertj@example.com',
					username: 'robertj',
					password: 'ExamplePass123!',
				} as CreateUserDto,
			},
		},
	})
	async create(
		@Body() createUserDto: CreateUserDto,
		@Req() request: RequestWithUser,
	) {
		return this.dataSource.transaction(async (manager) => {
			const user = await this.usersService.createInTransaction(
				createUserDto,
				manager,
			);
			await this.auditLog.recordEvent(
				{
					eventType: 'security',
					action: 'USER_CREATED',
					actorUserId: request.user.id,
					subjectUserId: user.id,
					resourceType: 'User',
					resourceId: user.id,
				},
				manager,
			);
			return user;
		});
	}

	@SerializeOptions({
		excludePrefixes: ['first', 'last'],
	})
	@Get()
	@ApiDocsPagination('User')
	@Roles(USER_ROLE.ADMIN)
	@UseGuards(RolesGuard)
	findAll(
		@Query(
			'offset',
			new ParsePaginationPipe({
				defaultValue: 0,
				minimum: 0,
				maximum: 1_000_000,
			}),
		)
		offset: number,
		@Query(
			'limit',
			new ParsePaginationPipe({ defaultValue: 20, minimum: 1, maximum: 100 }),
		)
		limit: number,
	) {
		return this.usersService.findAll({ skip: offset, take: limit });
	}

	@Get(':id')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'User UUID',
	})
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: RequestWithUser,
	) {
		this.assertSelfOrAdmin(request, id);
		return this.usersService.findOne(id);
	}

	@Post('student-cards')
	@FeatureFlag('studentCardUploads')
	@ApiOperation({
		summary: 'Upload student-card files (not implemented)',
	})
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				student_card_front: {
					type: 'string',
					format: 'binary',
				},
				student_card_back: {
					type: 'string',
					format: 'binary',
				},
				live_photos: {
					type: 'array',
					items: {
						type: 'string',
						format: 'binary',
					},
				},
			},
			required: ['student_card_front', 'student_card_back', 'live_photos'],
		},
	})
	@UseInterceptors(AnyFilesInterceptor(multipleImageUploadOptions))
	@Roles(USER_ROLE.ADMIN)
	@UseGuards(RolesGuard)
	updateStudentCard(@UploadedFiles() files: Array<Express.Multer.File>) {
		if (!files?.length) {
			throw new BadRequestException('At least one file is required');
		}
		if (files.length > 5 || files.some((file) => file.size > MAX_UPLOAD_SIZE)) {
			throw new BadRequestException('Student card upload exceeds file limits');
		}
		files.forEach(validateFileSignature);
		throw new NotImplementedException(
			'Student-card storage is not configured for this project',
		);
	}

	@Patch(':id')
	@ApiSuccessMessage('USER_UPDATED')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'User UUID',
	})
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUserDto: UpdateUserDto,
		@Req() request: RequestWithUser,
	) {
		this.assertSelfOrAdmin(request, id);
		return this.dataSource.transaction(async (manager) => {
			const user = await this.usersService.updateInTransaction(
				id,
				updateUserDto,
				manager,
			);
			await this.auditLog.recordEvent(
				{
					eventType: 'security',
					action: 'USER_UPDATED',
					actorUserId: request.user.id,
					subjectUserId: id,
					resourceType: 'User',
					resourceId: id,
					metadata: { changedFields: Object.keys(updateUserDto).length },
				},
				manager,
			);
			return user;
		});
	}

	@Delete(':id')
	@ApiSuccessMessage('USER_DELETED')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'User UUID',
	})
	@Roles(USER_ROLE.ADMIN)
	@UseGuards(RolesGuard)
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: RequestWithUser,
	) {
		await this.dataSource.transaction(async (manager) => {
			await this.usersService.removeInTransaction(id, manager);
			await this.auditLog.recordEvent(
				{
					eventType: 'security',
					action: 'USER_DELETED',
					actorUserId: request.user.id,
					subjectUserId: id,
					resourceType: 'User',
					resourceId: id,
				},
				manager,
			);
		});
	}

	private assertSelfOrAdmin(request: RequestWithUser, userId: string): void {
		if (
			request.user.id !== userId &&
			request.user.role?.name !== USER_ROLE.ADMIN
		) {
			throw new ForbiddenException('You can only access your own account');
		}
	}
}
