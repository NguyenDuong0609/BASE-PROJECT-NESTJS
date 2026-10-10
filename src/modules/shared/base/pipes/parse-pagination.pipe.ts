import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export interface PaginationPipeOptions {
	defaultValue: number;
	minimum: number;
	maximum: number;
}

@Injectable()
export class ParsePaginationPipe implements PipeTransform<
	string | undefined,
	number
> {
	constructor(private readonly options: PaginationPipeOptions) {}

	transform(value: string | undefined): number {
		if (value === undefined || value === '') return this.options.defaultValue;
		if (!/^\d+$/.test(value)) {
			throw new BadRequestException(
				'Pagination values must be non-negative integers',
			);
		}

		const parsed = Number(value);
		if (
			!Number.isSafeInteger(parsed) ||
			parsed < this.options.minimum ||
			parsed > this.options.maximum
		) {
			throw new BadRequestException(
				`Pagination value must be between ${this.options.minimum} and ${this.options.maximum}`,
			);
		}
		return parsed;
	}
}
