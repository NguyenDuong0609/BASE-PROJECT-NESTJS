import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { FeatureFlagGuard } from './feature-flag.guard';

describe('FeatureFlagGuard', () => {
	const context = {
		getHandler: jest.fn(),
		getClass: jest.fn(),
	} as never;

	it('allows routes without a feature flag', () => {
		const reflector = {
			getAllAndOverride: jest.fn().mockReturnValue(undefined),
		} as unknown as Reflector;
		const config = { get: jest.fn() } as unknown as ConfigService;
		const guard = new FeatureFlagGuard(reflector, config);

		expect(guard.canActivate(context)).toBe(true);
		expect(config.get).not.toHaveBeenCalled();
	});

	it('allows enabled features and defaults to enabled for compatibility', () => {
		const reflector = {
			getAllAndOverride: jest.fn().mockReturnValue('flashCards'),
		} as unknown as Reflector;
		const config = {
			get: jest.fn().mockReturnValue(true),
		} as unknown as ConfigService;
		const guard = new FeatureFlagGuard(reflector, config);

		expect(guard.canActivate(context)).toBe(true);
		expect(config.get).toHaveBeenCalledWith('features.flashCards', true);
	});

	it('hides disabled feature routes', () => {
		const reflector = {
			getAllAndOverride: jest.fn().mockReturnValue('comments'),
		} as unknown as Reflector;
		const config = {
			get: jest.fn().mockReturnValue(false),
		} as unknown as ConfigService;
		const guard = new FeatureFlagGuard(reflector, config);
		const activate = () => guard.canActivate(context);

		expect(activate).toThrow(NotFoundException);
	});
});
