export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

export function getErrorStack(error: unknown): string | undefined {
	return error instanceof Error ? error.stack : undefined;
}

export function getErrorCode(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null) {
		return undefined;
	}
	if ('code' in error && typeof error.code === 'string') return error.code;
	if (
		'driverError' in error &&
		typeof error.driverError === 'object' &&
		error.driverError !== null &&
		'code' in error.driverError &&
		typeof error.driverError.code === 'string'
	) {
		return error.driverError.code;
	}
	return undefined;
}
