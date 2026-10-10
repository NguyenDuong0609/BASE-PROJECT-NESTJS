import { Request } from 'express';

export function extractCookieToken(
	request: Request,
	cookieName: string,
): string | null {
	const cookieHeader = request.headers.cookie;
	if (!cookieHeader) return null;

	const prefix = `${cookieName}=`;
	const cookie = cookieHeader
		.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith(prefix));
	if (!cookie) return null;

	try {
		return decodeURIComponent(cookie.slice(prefix.length));
	} catch {
		return null;
	}
}
