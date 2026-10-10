/**
 * Google OAuth Mock Strategy
 *
 * Provides mock Google OAuth profile data for testing
 */

export interface GoogleProfile {
	id: string;
	displayName: string;
	name: {
		givenName: string;
		familyName: string;
	};
	emails: Array<{ value: string; verified: boolean }>;
	photos: Array<{ value: string }>;
	provider: string;
}

export class GoogleOAuthMock {
	static createMockProfile(overrides?: Partial<GoogleProfile>): GoogleProfile {
		return {
			id: 'google-user-123',
			displayName: 'John Doe',
			name: {
				givenName: 'John',
				familyName: 'Doe',
			},
			emails: [
				{
					value: 'john.doe@gmail.com',
					verified: true,
				},
			],
			photos: [
				{
					value: 'https://lh3.googleusercontent.com/a/default-user',
				},
			],
			provider: 'google',
			...overrides,
		};
	}

	static createUnverifiedProfile(): GoogleProfile {
		return this.createMockProfile({
			emails: [
				{
					value: 'unverified@gmail.com',
					verified: false,
				},
			],
		});
	}

	static createProfileWithoutEmail(): GoogleProfile {
		return this.createMockProfile({
			emails: [],
		});
	}
}

/**
 * Usage example:
 *
 * const mockProfile = GoogleOAuthMock.createMockProfile();
 * const result = await authService.validateGoogleUser(mockProfile);
 */
