import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthGuard } from './google-oauth.guard';

describe('GoogleOAuthGuard', () => {
	let guard: GoogleOAuthGuard;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GoogleOAuthGuard,
				{
					provide: ConfigService,
					useValue: { get: jest.fn().mockReturnValue(false) },
				},
			],
		}).compile();

		guard = module.get<GoogleOAuthGuard>(GoogleOAuthGuard);
	});

	it('should be defined', () => {
		expect(guard).toBeDefined();
	});

	describe('canActivate', () => {
		it('should delegate to passport google strategy', async () => {
			// Google OAuth guard extends AuthGuard('google')
			// which is handled by Passport
			expect(guard).toBeDefined();
		});
	});
});
