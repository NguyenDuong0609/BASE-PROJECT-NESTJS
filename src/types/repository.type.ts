export interface FindOptions {
	offset?: number;
	limit?: number;
	populate?: string[];
	sort?: Record<string, 'ASC' | 'DESC'>;
}

export interface FindOneOptions {
	populate?: string[];
	relations?: string[];
}
