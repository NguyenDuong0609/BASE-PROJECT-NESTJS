import { SetMetadata } from '@nestjs/common';
import {
	API_SUCCESS_MESSAGE_METADATA,
	ApiSuccessCode,
} from '../shared/api-success';

export const ApiSuccessMessage = (code: ApiSuccessCode) =>
	SetMetadata(API_SUCCESS_MESSAGE_METADATA, code);
