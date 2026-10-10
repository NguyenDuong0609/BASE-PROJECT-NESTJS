import {
	Injectable,
	NotFoundException,
	ForbiddenException,
	Optional,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { In } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CommentClosure } from './entities/comment-closure.entity';
import { User } from '@modules/users/entities/user.entity';
import { createContextLogger } from '../../configs/logger.config';

interface CreateCommentDto {
	content: string;
	postId: string;
	parentId?: string;
}

@Injectable()
export class CommentsService {
	private readonly logger: PinoLogger;

	constructor(
		@InjectRepository(Comment)
		private readonly commentRepository: Repository<Comment>,
		@InjectRepository(CommentClosure)
		private readonly closureRepository: Repository<CommentClosure>,
		@Optional() logger?: PinoLogger,
	) {
		this.logger = createContextLogger(CommentsService.name, logger);
	}

	async createComment(
		createDto: CreateCommentDto,
		authorId: string,
	): Promise<Comment> {
		return this.commentRepository.manager.transaction(async (manager) => {
			const commentRepo = manager.getRepository(Comment);
			const closureRepo = manager.getRepository(CommentClosure);

			const comment = commentRepo.create({
				content: createDto.content,
				postId: createDto.postId,
				author: { id: authorId } as User,
				depth: 0,
			});

			await commentRepo.save(comment);

			await closureRepo.save({
				ancestorId: comment.id,
				descendantId: comment.id,
				depth: 0,
			});

			if (createDto.parentId) {
				const parent = await commentRepo.findOne({
					where: { id: createDto.parentId },
				});

				if (!parent) {
					throw new NotFoundException('Parent comment not found');
				}
				if (parent.postId !== createDto.postId) {
					throw new ForbiddenException(
						'Reply must belong to the parent comment post',
					);
				}

				comment.depth = parent.depth + 1;
				await commentRepo.save(comment);

				const ancestorClosures = await closureRepo.find({
					where: { descendantId: createDto.parentId },
				});

				const newClosures = ancestorClosures.map((ac) =>
					closureRepo.create({
						ancestorId: ac.ancestorId,
						descendantId: comment.id,
						depth: ac.depth + 1,
					}),
				);

				await closureRepo.save(newClosures);
			}

			this.logger.info(
				{ commentId: comment.id, authorId, postId: createDto.postId },
				'Comment created',
			);
			return comment;
		});
	}

	async getCommentTree(
		postId: string,
		offset = 0,
		limit = 20,
	): Promise<Comment[]> {
		const roots = await this.commentRepository.find({
			where: { postId, depth: 0 },
			relations: ['author'],
			order: { createdAt: 'ASC' },
			skip: offset,
			take: limit,
		});
		if (!roots.length) return [];

		const closures = await this.closureRepository.find({
			where: { ancestorId: In(roots.map(({ id }) => id)) },
			order: { depth: 'ASC' },
		});
		const commentIds = [
			...new Set(closures.map(({ descendantId }) => descendantId)),
		];
		const comments = commentIds.length
			? await this.commentRepository.find({
					where: { id: In(commentIds) },
					relations: ['author'],
					order: { createdAt: 'ASC' },
				})
			: roots;

		const commentMap = new Map<string, Comment>();

		comments.forEach((comment) => {
			comment.replies = [];
			commentMap.set(comment.id, comment);
		});

		for (const closure of closures) {
			if (closure.depth !== 1) continue;
			const parent = commentMap.get(closure.ancestorId);
			const reply = commentMap.get(closure.descendantId);
			if (parent && reply) parent.replies.push(reply);
		}

		return roots
			.map((root) => commentMap.get(root.id))
			.filter((root): root is Comment => Boolean(root));
	}

	async getCommentAncestors(commentId: string): Promise<Comment[]> {
		const closures = await this.closureRepository.find({
			where: { descendantId: commentId },
			relations: ['ancestor', 'ancestor.author'],
			order: { depth: 'ASC' },
		});

		return closures
			.filter((c) => c.ancestorId !== commentId)
			.map((c) => c.ancestor);
	}

	async getCommentDescendants(commentId: string): Promise<Comment[]> {
		const closures = await this.closureRepository.find({
			where: { ancestorId: commentId },
			relations: ['descendant', 'descendant.author'],
			order: { depth: 'ASC' },
		});

		return closures
			.filter((c) => c.descendantId !== commentId)
			.map((c) => c.descendant);
	}

	async deleteComment(
		commentId: string,
		userId: string,
		isAdmin = false,
	): Promise<void> {
		const comment = await this.commentRepository.findOne({
			where: { id: commentId },
			relations: ['author'],
		});

		if (!comment) {
			throw new NotFoundException('Comment not found');
		}

		if (comment.author.id !== userId && !isAdmin) {
			throw new ForbiddenException('You can only delete your own comments');
		}

		const descendants = await this.getCommentDescendants(commentId);

		return this.commentRepository.manager.transaction(async (manager) => {
			const commentRepo = manager.getRepository(Comment);
			const idsToDelete = [commentId, ...descendants.map((d) => d.id)];
			await commentRepo.softDelete(idsToDelete);
			this.logger.info({ commentId }, 'Comment and descendants deleted');
		});
	}

	async updateComment(
		commentId: string,
		content: string,
		userId: string,
	): Promise<Comment> {
		const comment = await this.commentRepository.findOne({
			where: { id: commentId },
			relations: ['author'],
		});

		if (!comment) {
			throw new NotFoundException('Comment not found');
		}

		if (comment.author.id !== userId) {
			throw new ForbiddenException('You can only update your own comments');
		}

		comment.content = content;
		return this.commentRepository.save(comment);
	}
}
