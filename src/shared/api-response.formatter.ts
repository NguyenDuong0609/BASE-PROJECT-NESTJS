export interface ApiResponse<T = unknown> {
	statusCode: number;
	message: string;
	data: T | null;
	errors: string[] | null;
	errorCode: string | null;
}

export class ApiResponseFormatter {
	static success<T>(
		data: T | null,
		message = 'Success',
		statusCode = 200,
	): ApiResponse<T> {
		return {
			statusCode,
			message,
			data,
			errors: null,
			errorCode: null,
		};
	}

	static failure(
		statusCode: number,
		message: string,
		errors: string[] | null = null,
		errorCode: string | null = null,
	): ApiResponse<null> {
		return {
			statusCode,
			message,
			data: null,
			errors,
			errorCode,
		};
	}
}
