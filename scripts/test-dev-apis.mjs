import fs from 'node:fs';

const BASE_URL = 'http://127.0.0.1:3317';
const ORIGIN = 'http://localhost:4200';

const results = [];

function record(name, method, url, status, expectedStatus, details = null) {
	const pass = Array.isArray(expectedStatus)
		? expectedStatus.includes(status)
		: status === expectedStatus;
	results.push({ name, method, url, status, expectedStatus, pass, details });
	console.log(`[${pass ? 'PASS' : 'FAIL'}] ${method} ${url} -> ${status} (expected ${expectedStatus})`);
	if (!pass && details) {
		console.log('   Error details:', typeof details === 'object' ? JSON.stringify(details).slice(0, 300) : details);
	}
}

async function request(method, path, { token, body, isFormData, headers: customHeaders } = {}) {
	const headers = { ...customHeaders };
	if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
		headers['Origin'] = ORIGIN;
	}
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}
	let requestBody = body;
	if (body && !isFormData && typeof body === 'object') {
		headers['Content-Type'] = 'application/json';
		requestBody = JSON.stringify(body);
	}

	try {
		const res = await fetch(`${BASE_URL}${path}`, {
			method,
			headers,
			body: requestBody,
		});
		let resData;
		const text = await res.text();
		try {
			resData = JSON.parse(text);
		} catch {
			resData = text;
		}
		return { status: res.status, data: resData };
	} catch (err) {
		return { status: 0, error: err.message };
	}
}

async function run() {
	console.log('--- Starting Dev API Verification ---');

	// 1. App & Health & Metrics
	let res = await request('GET', '/');
	record('App Hello', 'GET', '/', res.status, 200, res.data);

	res = await request('GET', '/health');
	record('Health Liveness', 'GET', '/health', res.status, 200, res.data);

	res = await request('GET', '/health/live');
	record('Health Live', 'GET', '/health/live', res.status, 200, res.data);

	res = await request('GET', '/health/ready');
	record('Health Readiness', 'GET', '/health/ready', res.status, 200, res.data);

	res = await request('GET', '/metrics');
	record('Metrics Render', 'GET', '/metrics', res.status, 200, res.data);

	res = await request('GET', '/auth/csrf-token');
	record('Auth CSRF Token', 'GET', '/auth/csrf-token', res.status, 200, res.data);

	// 2. Auth - Admin Sign In
	res = await request('POST', '/auth/sign-in', {
		body: { email: 'admin@example.test', password: 'AdminPass123!@#' },
	});
	record('Admin Sign In', 'POST', '/auth/sign-in', res.status, [200, 201], res.data);
	const adminToken = res.data?.data?.access_token || res.data?.access_token;
	const adminRefreshToken = res.data?.data?.refresh_token || res.data?.refresh_token;

	// 3. Auth - Regular User Sign Up & Sign In
	const testEmail = `devuser_${Date.now()}@example.test`;
	res = await request('POST', '/auth/sign-up', {
		body: {
			first_name: 'Test',
			last_name: 'DevUser',
			email: testEmail,
			password: 'ExamplePass123!',
		},
	});
	record('User Sign Up', 'POST', '/auth/sign-up', res.status, 201, res.data);
	let userToken = res.data?.data?.access_token || res.data?.access_token;
	let userRefreshToken = res.data?.data?.refresh_token || res.data?.refresh_token;

	if (!userToken) {
		res = await request('POST', '/auth/sign-in', {
			body: { email: testEmail, password: 'ExamplePass123!' },
		});
		record('User Sign In', 'POST', '/auth/sign-in', res.status, [200, 201], res.data);
		userToken = res.data?.data?.access_token || res.data?.access_token;
		userRefreshToken = res.data?.data?.refresh_token || res.data?.refresh_token;
	}

	// 4. Queues (Admin only or bearer auth)
	res = await request('GET', '/queues/email-queue/status', { token: adminToken });
	record('Queue Status (admin)', 'GET', '/queues/email-queue/status', res.status, 200, res.data);

	// 5. User Roles (Admin)
	const newRoleName = `Role_${Date.now()}`;
	res = await request('POST', '/user-roles', {
		token: adminToken,
		body: {
			name: 'TeamLeader', // Try sample data from Swagger
			description: 'Team leader role with project management permissions',
		},
	});
	// Note: TeamLeader might already exist or create successfully
	record('Create User Role', 'POST', '/user-roles', res.status, [201, 409], res.data);

	res = await request('GET', '/user-roles', { token: adminToken });
	record('List User Roles', 'GET', '/user-roles', res.status, 200, res.data);
	const rolesList = res.data?.data || res.data || [];
	const sampleRole = Array.isArray(rolesList) ? rolesList[0] : null;
	const sampleRoleId = sampleRole?.id;

	if (sampleRoleId) {
		res = await request('GET', `/user-roles/${sampleRoleId}`, { token: adminToken });
		record('Get User Role by ID', 'GET', `/user-roles/${sampleRoleId}`, res.status, 200, res.data);

		res = await request('PATCH', `/user-roles/${sampleRoleId}`, {
			token: adminToken,
			body: { description: 'Updated role description from validation' },
		});
		record('Update User Role', 'PATCH', `/user-roles/${sampleRoleId}`, res.status, 200, res.data);
	}

	// 6. Permissions (Admin)
	res = await request('GET', '/permissions', { token: adminToken });
	record('List Permissions', 'GET', '/permissions', res.status, 200, res.data);

	res = await request('GET', '/permissions/roles', { token: adminToken });
	record('List Role Permissions', 'GET', '/permissions/roles', res.status, 200, res.data);

	if (sampleRoleId) {
		res = await request('PUT', `/permissions/roles/${sampleRoleId}`, {
			token: adminToken,
			body: { codes: ['flash-cards:read', 'flash-cards:create'] },
		});
		record('Replace Role Permissions', 'PUT', `/permissions/roles/${sampleRoleId}`, res.status, 200, res.data);
	}

	// 7. Users CRUD (Admin)
	const newAdminCreatedEmail = `admin_created_${Date.now()}@example.test`;
	const newAdminCreatedUsername = `usr_${Date.now().toString().slice(-8)}`;
	res = await request('POST', '/users', {
		token: adminToken,
		body: {
			first_name: 'Jane',
			last_name: 'Smith',
			email: newAdminCreatedEmail,
			username: newAdminCreatedUsername,
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
			interested_languages: ['English', 'French'],
		},
	});
	record('Admin Create User', 'POST', '/users', res.status, 201, res.data);
	const createdUserId = res.data?.data?.id || res.data?.id;

	res = await request('GET', '/users?offset=0&limit=10', { token: adminToken });
	record('Find All Users', 'GET', '/users?offset=0&limit=10', res.status, 200, res.data);

	if (createdUserId) {
		res = await request('GET', `/users/${createdUserId}`, { token: adminToken });
		record('Find One User', 'GET', `/users/${createdUserId}`, res.status, 200, res.data);

		res = await request('PATCH', `/users/${createdUserId}`, {
			token: adminToken,
			body: {
				first_name: 'Janet',
				headline: 'Updated headline via validation script',
			},
		});
		record('Update User', 'PATCH', `/users/${createdUserId}`, res.status, 200, res.data);

		res = await request('DELETE', `/users/${createdUserId}`, { token: adminToken });
		record('Delete User', 'DELETE', `/users/${createdUserId}`, res.status, 200, res.data);
	}

	// 8. Topics (Admin create/update/delete, public read)
	const topicName = `Topic_${Date.now()}`;
	res = await request('POST', '/topics', {
		token: adminToken,
		body: {
			name: topicName,
			description: 'Common English words and phrases for everyday conversations',
		},
	});
	record('Create Topic', 'POST', '/topics', res.status, 201, res.data);
	const topicId = res.data?.data?.id || res.data?.id;

	res = await request('GET', '/topics');
	record('Find All Topics', 'GET', '/topics', res.status, 200, res.data);

	if (topicId) {
		res = await request('GET', `/topics/${topicId}`);
		record('Find One Topic', 'GET', `/topics/${topicId}`, res.status, 200, res.data);

		res = await request('PATCH', `/topics/${topicId}`, {
			token: adminToken,
			body: { description: 'Updated topic description' },
		});
		record('Update Topic', 'PATCH', `/topics/${topicId}`, res.status, 200, res.data);

		res = await request('DELETE', `/topics/${topicId}`, { token: adminToken });
		record('Delete Topic (Admin)', 'DELETE', `/topics/${topicId}`, res.status, 200, res.data);
	}

	// 9. Collections (User)
	// Collections expects multipart/form-data or json? Let's check how controller handles it.
	// In Swagger it's multipart/form-data with name, description, level, is_public, image
	const formDataBoundary = '----WebKitFormBoundaryDevVal' + Math.random().toString(36).substring(2);
	const colBody = [
		`--${formDataBoundary}`,
		'Content-Disposition: form-data; name="name"',
		'',
		'Learn Kitchen Vocabulary',
		`--${formDataBoundary}`,
		'Content-Disposition: form-data; name="description"',
		'',
		'Some description',
		`--${formDataBoundary}`,
		'Content-Disposition: form-data; name="level"',
		'',
		'chaos',
		`--${formDataBoundary}`,
		'Content-Disposition: form-data; name="is_public"',
		'',
		'true',
		`--${formDataBoundary}--`,
		'',
	].join('\r\n');

	res = await request('POST', '/collections', {
		token: userToken,
		body: colBody,
		isFormData: true,
		headers: { 'Content-Type': `multipart/form-data; boundary=${formDataBoundary}` },
	});
	record('Create Collection (form-data)', 'POST', '/collections', res.status, 201, res.data);
	const collectionId = res.data?.data?.id || res.data?.id;

	res = await request('GET', '/collections?offset=0&limit=10', { token: userToken });
	record('Find All Collections', 'GET', '/collections?offset=0&limit=10', res.status, 200, res.data);

	if (collectionId) {
		res = await request('GET', `/collections/${collectionId}`, { token: userToken });
		record('Find One Collection', 'GET', `/collections/${collectionId}`, res.status, 200, res.data);

		res = await request('PATCH', `/collections/${collectionId}`, {
			token: userToken,
			body: {
				name: 'Updated TOEIC Collection',
				level: 'medium',
			},
		});
		record('Update Collection', 'PATCH', `/collections/${collectionId}`, res.status, 200, res.data);

		res = await request('DELETE', `/collections/${collectionId}`, { token: userToken });
		record('Delete Collection', 'DELETE', `/collections/${collectionId}`, res.status, 200, res.data);
	}

	// 10. Flash Cards (User)
	// Flash card expects multipart/form-data with vocabulary, definition, meaning, pronunciation, examples, image
	const fcBoundary = '----WebKitFormBoundaryFC' + Math.random().toString(36).substring(2);
	const fcBody = [
		`--${fcBoundary}`,
		'Content-Disposition: form-data; name="vocabulary"',
		'',
		'provision',
		`--${fcBoundary}`,
		'Content-Disposition: form-data; name="definition"',
		'',
		'the action of providing or supplying something for use.',
		`--${fcBoundary}`,
		'Content-Disposition: form-data; name="meaning"',
		'',
		'sự cung cấp',
		`--${fcBoundary}`,
		'Content-Disposition: form-data; name="pronunciation"',
		'',
		'prəˈviZHən',
		`--${fcBoundary}`,
		'Content-Disposition: form-data; name="examples"',
		'',
		'new contracts for the provision of services',
		`--${fcBoundary}`,
		'Content-Disposition: form-data; name="image"',
		'',
		'https://example.test/serendipity.jpg',
		`--${fcBoundary}--`,
		'',
	].join('\r\n');

	res = await request('POST', '/flash-cards', {
		token: userToken,
		body: fcBody,
		isFormData: true,
		headers: { 'Content-Type': `multipart/form-data; boundary=${fcBoundary}` },
	});
	record('Create Flash Card', 'POST', '/flash-cards', res.status, 201, res.data);
	const flashCardId = res.data?.data?.id || res.data?.id;

	res = await request('GET', '/flash-cards', { token: userToken });
	record('Find All Flash Cards', 'GET', '/flash-cards', res.status, 200, res.data);

	if (flashCardId) {
		res = await request('GET', `/flash-cards/${flashCardId}`, { token: userToken });
		record('Find One Flash Card', 'GET', `/flash-cards/${flashCardId}`, res.status, 200, res.data);

		res = await request('PATCH', `/flash-cards/${flashCardId}`, {
			token: adminToken,
			body: {
				vocabulary: 'Serendipity',
				definition: 'The occurrence and development of events by chance in a happy way',
				meaning: 'Sự tình cờ may mắn',
			},
		});
		record('Update Flash Card (Admin)', 'PATCH', `/flash-cards/${flashCardId}`, res.status, 200, res.data);

		res = await request('DELETE', `/flash-cards/${flashCardId}`, { token: adminToken });
		record('Delete Flash Card (Admin)', 'DELETE', `/flash-cards/${flashCardId}`, res.status, 200, res.data);
	}

	// 11. Comments (User)
	const demoPostId = 'postman-demo-post';
	res = await request('POST', `/comments/posts/${demoPostId}`, {
		token: userToken,
		body: { content: 'This is a great flashcard set! Thanks for sharing.' },
	});
	record('Create Root Comment', 'POST', `/comments/posts/${demoPostId}`, res.status, 201, res.data);
	const commentId = res.data?.data?.id || res.data?.id;

	if (commentId) {
		res = await request('POST', `/comments/${commentId}/replies`, {
			token: userToken,
			body: {
				content: 'I agree with this explanation!',
				postId: demoPostId,
			},
		});
		record('Create Reply Comment', 'POST', `/comments/${commentId}/replies`, res.status, 201, res.data);

		res = await request('GET', `/comments/posts/${demoPostId}/tree`, { token: userToken });
		record('Get Comment Tree', 'GET', `/comments/posts/${demoPostId}/tree`, res.status, 200, res.data);

		res = await request('GET', `/comments/${commentId}/ancestors`, { token: userToken });
		record('Get Comment Ancestors', 'GET', `/comments/${commentId}/ancestors`, res.status, 200, res.data);

		res = await request('GET', `/comments/${commentId}/descendants`, { token: userToken });
		record('Get Comment Descendants', 'GET', `/comments/${commentId}/descendants`, res.status, 200, res.data);

		res = await request('PATCH', `/comments/${commentId}`, {
			token: userToken,
			body: { content: 'Updated comment text content.' },
		});
		record('Update Comment', 'PATCH', `/comments/${commentId}`, res.status, 200, res.data);

		res = await request('DELETE', `/comments/${commentId}`, { token: userToken });
		record('Delete Comment', 'DELETE', `/comments/${commentId}`, res.status, 200, res.data);
	}

	// 12. Checkin (User)
	res = await request('POST', '/checkin', { token: userToken });
	record('Perform Checkin', 'POST', '/checkin', res.status, [200, 201], res.data);

	res = await request('GET', '/checkin/history', { token: userToken });
	record('Get Checkin History', 'GET', '/checkin/history', res.status, 200, res.data);

	res = await request('GET', '/checkin/stats', { token: userToken });
	record('Get Checkin Stats', 'GET', '/checkin/stats', res.status, 200, res.data);

	res = await request('GET', '/checkin/status', { token: userToken });
	record('Get Checkin Status', 'GET', '/checkin/status', res.status, 200, res.data);

	// 13. Flash Cards State (User / TeamLeader / Admin)
	res = await request('POST', '/flash-cards-state', {
		token: userToken,
		body: {
			title: 'What is NestJS?',
			question: 'What progressive Node.js framework is built on top of Express/Fastify?',
			answer: 'NestJS',
		},
	});
	record('Create Flash Card State (draft)', 'POST', '/flash-cards-state', res.status, 201, res.data);
	const stateId = res.data?.data?.id || res.data?.id;

	res = await request('GET', '/flash-cards-state?offset=0&limit=10', { token: userToken });
	record('Find All Flash Cards State', 'GET', '/flash-cards-state?offset=0&limit=10', res.status, 200, res.data);

	if (stateId) {
		res = await request('GET', `/flash-cards-state/${stateId}`, { token: userToken });
		record('Find One Flash Card State', 'GET', `/flash-cards-state/${stateId}`, res.status, 200, res.data);

		res = await request('PATCH', `/flash-cards-state/${stateId}`, {
			token: userToken,
			body: {
				title: 'What is NestJS framework?',
			},
		});
		record('Update Flash Card State', 'PATCH', `/flash-cards-state/${stateId}`, res.status, 200, res.data);

		res = await request('POST', `/flash-cards-state/${stateId}/submit`, {
			token: userToken,
			body: { comment: 'Completed first draft, ready for review.' },
		});
		record('Submit Flash Card State', 'POST', `/flash-cards-state/${stateId}/submit`, res.status, 201, res.data);

		res = await request('POST', `/flash-cards-state/${stateId}/approve`, {
			token: adminToken,
			body: { comment: 'First approval.' },
		});
		record('Approve Flash Card State 1 (Admin)', 'POST', `/flash-cards-state/${stateId}/approve`, res.status, 201, res.data);

		res = await request('POST', `/flash-cards-state/${stateId}/approve`, {
			token: adminToken,
			body: { comment: 'Second approval.' },
		});
		record('Approve Flash Card State 2 (Admin)', 'POST', `/flash-cards-state/${stateId}/approve`, res.status, 201, res.data);

		res = await request('POST', `/flash-cards-state/${stateId}/publish`, {
			token: adminToken,
			body: { comment: 'Publishing to production.' },
		});
		record('Publish Flash Card State (Admin)', 'POST', `/flash-cards-state/${stateId}/publish`, res.status, 201, res.data);

		res = await request('GET', `/flash-cards-state/${stateId}/transitions`, { token: userToken });
		record('Get Flash Card State Transitions', 'GET', `/flash-cards-state/${stateId}/transitions`, res.status, 200, res.data);

		res = await request('GET', `/flash-cards-state/${stateId}/allowed-transitions`, { token: userToken });
		record('Get Allowed State Transitions', 'GET', `/flash-cards-state/${stateId}/allowed-transitions`, res.status, 200, res.data);
	}

	// 14. Audit (Admin)
	res = await request('GET', '/audit/events', { token: adminToken });
	record('Audit Events', 'GET', '/audit/events', res.status, 200, res.data);

	const adminUserId = '2fde9d3c-dc8a-40ff-b799-94d45886c9a0';
	res = await request('GET', `/audit/user?userId=${adminUserId}`, { token: adminToken });
	record('Audit User', 'GET', `/audit/user`, res.status, 200, res.data);

	res = await request('GET', `/audit/resource?resource=User&resourceId=${adminUserId}`, { token: adminToken });
	record('Audit Resource', 'GET', `/audit/resource`, res.status, 200, res.data);

	// 15. 2FA (Two Factor Authentication Flow)
	res = await request('POST', '/auth/2fa/setup', {
		token: userToken,
		body: { password: 'ExamplePass123!' },
	});
	record('2FA Setup', 'POST', '/auth/2fa/setup', res.status, 201, res.data);
	const twoFactorSecret = res.data?.data?.secret || res.data?.secret;

	if (twoFactorSecret) {
		const { TOTP, NobleCryptoPlugin, ScureBase32Plugin } = await import('otplib');
		const totp = new TOTP({
			crypto: new NobleCryptoPlugin(),
			base32: new ScureBase32Plugin(),
			period: 30,
			digits: 6,
		});
		const totpCode = await totp.generate({ secret: twoFactorSecret });

		res = await request('POST', '/auth/2fa/enable', {
			token: userToken,
			body: { code: totpCode },
		});
		record('2FA Enable', 'POST', '/auth/2fa/enable', res.status, 201, res.data);

		// Disable 2FA
		const disableCode = await totp.generate({ secret: twoFactorSecret });
		res = await request('POST', '/auth/2fa/disable', {
			token: userToken,
			body: { password: 'ExamplePass123!', code: disableCode },
		});
		record('2FA Disable', 'POST', '/auth/2fa/disable', res.status, 201, res.data);
	}

	// 16. Auth Refresh & Logout
	res = await request('POST', '/auth/refresh', { token: userRefreshToken });
	record('Auth Refresh', 'POST', '/auth/refresh', res.status, [200, 201], res.data);
	const newRefreshToken = res.data?.data?.refresh_token || res.data?.refresh_token || userRefreshToken;

	res = await request('POST', '/auth/logout', { token: newRefreshToken });
	record('Auth Logout', 'POST', '/auth/logout', res.status, [200, 201], res.data);

	console.log('\n--- Summary ---');
	const passed = results.filter((r) => r.pass).length;
	const failed = results.filter((r) => !r.pass).length;
	console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);

	fs.writeFileSync('dev-api-test-results.json', JSON.stringify(results, null, 2));
}

run().catch(console.error);
