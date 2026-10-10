import { writeFile } from 'node:fs/promises';

const specUrl =
	process.env.OPENAPI_URL || 'http://localhost:3000/api-docs-json';
const outputPath = process.argv[2] || 'postman_collection.json';
const headers = {};

if (process.env.SWAGGER_USERNAME || process.env.SWAGGER_PASSWORD) {
	if (!process.env.SWAGGER_USERNAME || !process.env.SWAGGER_PASSWORD) {
		throw new Error(
			'Set both SWAGGER_USERNAME and SWAGGER_PASSWORD to fetch the protected OpenAPI document.',
		);
	}
	headers.Authorization = `Basic ${Buffer.from(
		`${process.env.SWAGGER_USERNAME}:${process.env.SWAGGER_PASSWORD}`,
	).toString('base64')}`;
}

const response = await fetch(specUrl, { headers });
if (!response.ok) {
	throw new Error(`Could not fetch OpenAPI document (${response.status}).`);
}
const document = await response.json();

function resolveSchema(schema, seen = new Set()) {
	if (!schema) return {};
	if (schema.$ref) {
		if (seen.has(schema.$ref)) return {};
		seen.add(schema.$ref);
		const name = schema.$ref.split('/').at(-1);
		return resolveSchema(document.components?.schemas?.[name], seen);
	}
	if (schema.allOf) {
		return Object.assign(
			{},
			...schema.allOf.map((part) => resolveSchema(part, seen)),
		);
	}
	if (schema.oneOf || schema.anyOf) {
		return resolveSchema((schema.oneOf || schema.anyOf)[0], seen);
	}
	if (schema.type === 'array') {
		return [sampleValue(schema.items, seen)];
	}
	if (schema.type === 'object' || schema.properties) {
		return Object.fromEntries(
			Object.entries(schema.properties || {}).map(([key, value]) => [
				key,
				sampleValue(value, seen),
			]),
		);
	}
	return sampleValue(schema, seen);
}

function sampleValue(schema, seen = new Set()) {
	if (!schema) return 'sample';
	if (schema.example !== undefined) return schema.example;
	if (schema.default !== undefined) return schema.default;
	if (schema.enum?.length) return schema.enum[0];
	if (schema.$ref || schema.allOf || schema.oneOf || schema.anyOf) {
		return resolveSchema(schema, seen);
	}
	if (schema.type === 'array') return [sampleValue(schema.items, seen)];
	if (schema.type === 'object' || schema.properties) {
		return resolveSchema(schema, seen);
	}
	if (schema.format === 'binary') return '';
	if (schema.pattern === '^\\d{6}$') return '123456';
	if (schema.format === 'email') return 'api.user@example.test';
	if (schema.format === 'uuid') return 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b';
	if (schema.format === 'uri' || schema.format === 'url') {
		return 'https://example.test/sample-resource';
	}
	if (schema.format === 'date-time') return '2025-01-15T12:00:00.000Z';
	if (schema.type === 'integer' || schema.type === 'number') return 1;
	if (schema.type === 'boolean') return true;
	if (schema.type === 'string') return 'Sample value';
	return null;
}

function requestBody(operation, path) {
	const content = operation.requestBody?.content;
	if (!content) return undefined;
	const mediaType =
		[
			'application/json',
			'multipart/form-data',
			'application/x-www-form-urlencoded',
		].find((type) => content[type]) || Object.keys(content)[0];
	const schema = content[mediaType]?.schema;
	if (!schema) return undefined;
	const explicitExample =
		content[mediaType]?.example ??
		Object.values(content[mediaType]?.examples || {})[0]?.value;
	if (explicitExample !== undefined && mediaType !== 'multipart/form-data') {
		return {
			mode: 'raw',
			raw: JSON.stringify(explicitExample, null, 2),
			options: { raw: { language: 'json' } },
		};
	}

	if (mediaType === 'multipart/form-data') {
		const resolved = resolveSchema(schema);
		const properties =
			schema.properties ||
			Object.fromEntries(Object.keys(resolved).map((key) => [key, {}]));
		return {
			mode: 'formdata',
			formdata: Object.entries(properties).flatMap(([key, property]) => {
				if (path === '/flash-cards' && key === 'image') {
					return {
						key,
						type: 'text',
						value: 'https://example.test/serendipity.jpg',
						description:
							'Use this URL for a no-file sample; replace with a file to upload one.',
					};
				}
				if (property.type === 'array') {
					const values = sampleValue(property);
					return (Array.isArray(values) ? values : [values]).map((value) => ({
						key,
						type: property.items?.format === 'binary' ? 'file' : 'text',
						...(property.items?.format === 'binary'
							? { src: [], disabled: true }
							: { value: String(value) }),
					}));
				}
				return {
					key,
					type: property.format === 'binary' ? 'file' : 'text',
					...(property.format === 'binary'
						? { src: [], disabled: true }
						: { value: String(sampleValue(property)) }),
				};
			}),
		};
	}

	return {
		mode: 'raw',
		raw: JSON.stringify(resolveSchema(schema), null, 2),
		options: { raw: { language: 'json' } },
	};
}

const folders = new Map();
const pathVariables = new Set();
const globalVariables = [
	{
		key: 'base_url',
		value: process.env.POSTMAN_BASE_URL || 'http://localhost:3317',
		type: 'string',
	},
	{
		key: 'frontend_origin',
		value: process.env.POSTMAN_FRONTEND_ORIGIN || 'http://localhost:4200',
		type: 'string',
	},
	{ key: 'access_token', value: '', type: 'string' },
	{ key: 'refresh_token', value: '', type: 'string' },
	{ key: 'admin_access_token', value: '', type: 'string' },
	{ key: 'demo_email', value: '', type: 'string' },
	{ key: 'demo_password', value: 'ExamplePass123!', type: 'string' },
	{ key: 'admin_email', value: '', type: 'string' },
	{ key: 'post_id', value: 'postman-demo-post', type: 'string' },
	{ key: 'account_email_flows_enabled', value: 'false', type: 'string' },
	{ key: 'google_oauth_enabled', value: 'false', type: 'string' },
	{ key: 's3_enabled', value: 'false', type: 'string' },
	{ key: 'enable_file_uploads', value: 'false', type: 'string' },
];

function variableName(name) {
	return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function resourceVariable(path, parameter) {
	if (parameter === 'jobId') return 'job_id';
	if (parameter === 'name') return 'queue_name';
	if (parameter === 'postId') return 'post_id';
	if (parameter === 'roleId') return 'role_id';
	if (parameter === 'commentId') return 'comment_id';
	if (parameter !== 'id') return variableName(parameter);
	if (path.startsWith('/user-roles')) return 'role_id';
	if (path.startsWith('/users')) return 'user_id';
	if (path.startsWith('/topics')) return 'topic_id';
	if (path.startsWith('/collections')) return 'collection_id';
	if (path.startsWith('/flash-cards-state')) return 'flash_card_state_id';
	if (path.startsWith('/flash-cards')) return 'flash_card_id';
	if (path.startsWith('/comments')) return 'comment_id';
	if (path.startsWith('/media')) return 'media_id';
	return 'resource_id';
}

function requiresAdmin(path, method) {
	return (
		path.startsWith('/audit/') ||
		path.startsWith('/permissions') ||
		path.startsWith('/user-roles') ||
		path === '/users' ||
		(path.startsWith('/users/') && method === 'delete') ||
		path.startsWith('/queues/') ||
		(path.startsWith('/topics') && method !== 'get') ||
		(path.startsWith('/flash-cards/') &&
			['patch', 'delete'].includes(method)) ||
		path === '/users/student-cards' ||
		(path.startsWith('/flash-cards-state/') &&
			['/approve', '/reject', '/publish'].some((suffix) =>
				path.endsWith(suffix),
			))
	);
}

function skipReason(path) {
	if (path === '/auth/google' || path === '/auth/google/callback') {
		return 'Google OAuth requires configured provider credentials and browser callback.';
	}
	if (
		path.includes('/password-reset/confirm') ||
		path.includes('/email-verification/confirm')
	) {
		return 'Requires a one-time token delivered by email; request it with a configured mail provider first.';
	}
	if (path.startsWith('/auth/2fa/')) {
		return 'Requires two-factor setup and a current authenticator code.';
	}
	if (
		path === '/auth/password-reset/request' ||
		path === '/auth/email-verification/request'
	) {
		return 'Requires account email flows enabled and a configured mail provider.';
	}
	if (path === '/media/upload' || path === '/users/student-cards') {
		return 'Requires a local file. Binary sample inputs are intentionally disabled.';
	}
	return '';
}

for (const [path, pathItem] of Object.entries(document.paths || {})) {
	const folderName = path.split('/').filter(Boolean)[0] || 'Application';
	if (!folders.has(folderName)) {
		folders.set(folderName, { name: folderName, item: [] });
	}

	for (const [method, operation] of Object.entries(pathItem)) {
		if (
			!['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(
				method,
			)
		) {
			continue;
		}
		const parameters = [
			...(pathItem.parameters || []),
			...(operation.parameters || []),
		];
		const queries = parameters
			.filter((parameter) => parameter.in === 'query')
			.map((parameter) => ({
				key: parameter.name,
				value: String(
					parameter.example ??
						parameter.schema?.example ??
						Object.values(parameter.examples || {})[0]?.value ??
						parameter.schema?.default ??
						parameter.schema?.enum?.[0] ??
						parameter.schema?.items?.enum?.[0] ??
						(['integer', 'number'].includes(parameter.schema?.type)
							? 0
							: 'sample'),
				),
				description: parameter.description,
			}));
		const renderedPath = path.replace(/\{([^}]+)\}/g, (_, name) => {
			const variable = resourceVariable(path, name);
			pathVariables.add(variable);
			return `{{${variable}}}`;
		});
		const rawUrl = `{{base_url}}${renderedPath}${queries.length ? `?${queries.map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}` : ''}`;
		const security = operation.security ?? document.security ?? [];
		const request = {
			method: method.toUpperCase(),
			header: ['post', 'put', 'patch', 'delete'].includes(method)
				? [{ key: 'Origin', value: '{{frontend_origin}}' }]
				: [],
			url: {
				raw: rawUrl,
				host: ['{{base_url}}'],
				path: renderedPath.split('/').filter(Boolean),
				...(queries.length ? { query: queries } : {}),
			},
		};
		const body = requestBody(operation, path);
		if (
			folderName === 'comments' &&
			path.endsWith('/replies') &&
			body?.mode === 'raw'
		) {
			body.raw = body.raw.replace(
				/"postId":\s*"[^"]+"/,
				'"postId": "{{post_id}}"',
			);
		}
		if (body) request.body = body;

		if (!security.length) {
			request.auth = { type: 'noauth' };
		}
		if (path === '/auth/refresh' || path === '/auth/logout') {
			request.auth = {
				type: 'bearer',
				bearer: [{ key: 'token', value: '{{refresh_token}}', type: 'string' }],
			};
		}

		const adminOnly = requiresAdmin(path, method);
		if (adminOnly) {
			request.auth = {
				type: 'bearer',
				bearer: [
					{ key: 'token', value: '{{admin_access_token}}', type: 'string' },
				],
			};
		}
		if (path === '/auth/sign-in') {
			const raw = JSON.parse(request.body.raw);
			raw.email = '{{demo_email}}';
			raw.password = '{{demo_password}}';
			request.body.raw = JSON.stringify(raw, null, 2);
		}
		if (path === '/auth/sign-up') {
			const raw = JSON.parse(request.body.raw);
			raw.email = '{{demo_email}}';
			raw.password = '{{demo_password}}';
			request.body.raw = JSON.stringify(raw, null, 2);
		}

		const prerequest = [];
		if (path === '/auth/sign-up') {
			prerequest.push(
				'const adminEmail = pm.environment.get("admin_email") || ""; const currentEmail = pm.environment.get("demo_email") || pm.collectionVariables.get("demo_email") || ""; if (adminEmail && currentEmail === adminEmail) { pm.execution.skipRequest(); } else if (!currentEmail || currentEmail.startsWith("postman-")) { const email = `postman-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.test`; pm.collectionVariables.set("demo_email", email); pm.environment.set("demo_email", email); }',
			);
		}
		const shouldSkip = skipReason(path);
		if (shouldSkip) {
			if (path === '/auth/google' || path === '/auth/google/callback') {
				prerequest.push(
					'if (pm.environment.get("google_oauth_enabled") !== "true") { pm.execution.skipRequest(); }',
				);
			} else if (
				path === '/auth/password-reset/request' ||
				path === '/auth/email-verification/request'
			) {
				prerequest.push(
					'if (pm.environment.get("account_email_flows_enabled") !== "true") { pm.execution.skipRequest(); }',
				);
			} else if (path === '/queues/{name}/jobs/{jobId}') {
				prerequest.push(
					'if (!pm.environment.get("job_id") && !pm.collectionVariables.get("job_id")) { pm.execution.skipRequest(); }',
				);
			} else if (path === '/media/upload') {
				prerequest.push(
					'if (pm.environment.get("s3_enabled") !== "true" || pm.environment.get("enable_file_uploads") !== "true") { pm.execution.skipRequest(); }',
				);
			} else if (path === '/users/student-cards') {
				prerequest.push('pm.execution.skipRequest();');
			} else {
				prerequest.push('pm.execution.skipRequest();');
			}
		}
		if (adminOnly) {
			prerequest.push(
				'if (!pm.environment.get("admin_access_token") && !pm.collectionVariables.get("admin_access_token")) { pm.execution.skipRequest(); }',
			);
		}
		if (path.startsWith('/media/') && path !== '/media/upload') {
			prerequest.push(
				'if (!pm.environment.get("media_id") && !pm.collectionVariables.get("media_id")) { pm.execution.skipRequest(); }',
			);
		}
		const captureVariable =
			method === 'post' && path === '/user-roles'
				? 'role_id'
				: method === 'post' && path === '/auth/sign-up'
					? 'user_id'
					: method === 'post' && path === '/topics'
						? 'topic_id'
						: method === 'post' && path === '/collections'
							? 'collection_id'
							: method === 'post' && path === '/flash-cards'
								? 'flash_card_id'
								: method === 'post' && path === '/flash-cards-state'
									? 'flash_card_state_id'
									: method === 'post' && path === '/comments/posts/{postId}'
										? 'comment_id'
										: method === 'post' && path.endsWith('/replies')
											? 'reply_id'
											: method === 'post' && path === '/media/upload'
												? 'media_id'
												: '';
		const events = [
			'(() => {',
			'let json;',
			'try { json = pm.response.json(); } catch {}',
			'const data = json && json.data ? json.data : json;',
			'if (data && data.access_token) { pm.collectionVariables.set("access_token", data.access_token); pm.environment.set("access_token", data.access_token); }',
			'if (data && data.refresh_token) { pm.collectionVariables.set("refresh_token", data.refresh_token); pm.environment.set("refresh_token", data.refresh_token); }',
			'const accessToken = data && data.access_token; if (accessToken) { try { const payload = JSON.parse(atob(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); const userId = payload.user_id || payload.sub; if (userId) { pm.collectionVariables.set("user_id", userId); pm.environment.set("user_id", userId); } } catch {} }',
			'if (accessToken && pm.environment.get("admin_email") && pm.environment.get("demo_email") === pm.environment.get("admin_email")) { pm.collectionVariables.set("admin_access_token", accessToken); pm.environment.set("admin_access_token", accessToken); }',
			...(captureVariable
				? [
						`if (data && data.id) { pm.collectionVariables.set("${captureVariable}", data.id); pm.environment.set("${captureVariable}", data.id); }`,
					]
				: []),
			'})();',
		];

		folders.get(folderName).item.push({
			name: operation.summary || `${method.toUpperCase()} ${path}`,
			request,
			response: [],
			event: [
				...(prerequest.length
					? [
							{
								listen: 'prerequest',
								script: { type: 'text/javascript', exec: prerequest },
							},
						]
					: []),
				{
					listen: 'test',
					script: { type: 'text/javascript', exec: events },
				},
			],
			description: [
				operation.description || '',
				shouldSkip,
				adminOnly
					? 'Requires an Admin bearer token in `admin_access_token`.'
					: '',
			]
				.filter(Boolean)
				.join('\n\n'),
		});
	}
}

for (const name of pathVariables) {
	if (globalVariables.some((variable) => variable.key === name)) continue;
	globalVariables.push({
		key: name,
		value:
			name === 'job_id'
				? ''
				: name === 'media_id'
					? ''
					: name.toLowerCase().includes('id')
						? 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b'
						: name === 'queue_name'
							? 'email-queue'
							: name === 'post_id'
								? 'postman-demo-post'
								: 'sample',
		type: 'string',
	});
}

const collection = {
	info: {
		name: document.info?.title || 'NestJS Base API',
		description:
			'Generated from the running OpenAPI document. Import the matching Postman environment, then run Auth first. Sample IDs are captured from create responses. Admin, file-upload, email-token, 2FA, and external-provider requests are skipped unless their prerequisites are configured.',
		schema:
			'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
	},
	auth: {
		type: 'bearer',
		bearer: [{ key: 'token', value: '{{access_token}}', type: 'string' }],
	},
	variable: globalVariables,
	item: [...folders.values()].sort((left, right) =>
		left.name === 'auth' ? -1 : right.name === 'auth' ? 1 : 0,
	),
};

await writeFile(outputPath, `${JSON.stringify(collection, null, 2)}\n`);
const environmentPath =
	process.env.POSTMAN_ENV_PATH || 'postman_environment.json';
const environment = {
	id: '8cbce8e2-2f90-47fc-a563-c43583310d10',
	name: 'NestJS Base API - Local',
	values: globalVariables.map(({ key, value }) => ({
		key,
		value,
		enabled: true,
	})),
	_postman_variable_scope: 'environment',
	_postman_exported_using: 'NestJS Base API collection generator',
};
await writeFile(environmentPath, `${JSON.stringify(environment, null, 2)}\n`);
console.log(
	`Wrote ${outputPath} and ${environmentPath} with ${collection.item.reduce((sum, folder) => sum + folder.item.length, 0)} operations.`,
);
