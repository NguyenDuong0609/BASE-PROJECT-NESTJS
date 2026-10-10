import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { CommentClosure } from './entities/comment-closure.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';

@Module({
	imports: [TypeOrmModule.forFeature([Comment, CommentClosure])],
	controllers: [CommentsController],
	providers: [CommentsService],
	exports: [CommentsService],
})
export class CommentsModule {}
