import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_METADATA = 'feature-flag';

export type FeatureFlagName =
	| 'flashCards'
	| 'collections'
	| 'topics'
	| 'checkin'
	| 'comments'
	| 'flashCardStates'
	| 'metrics'
	| 'accountEmailFlows'
	| 'studentCardUploads'
	| 'twoFactor';

export const FeatureFlag = (name: FeatureFlagName) =>
	SetMetadata(FEATURE_FLAG_METADATA, name);
