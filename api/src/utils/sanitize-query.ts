import { flatten, get, merge, set } from 'lodash';
import logger from '../logger';
import { Aggregate, Filter, Meta, Query, Sort } from '../types';
import { Accountability } from '@directus/shared/types';
import { parseFilter, deepMap } from '@directus/shared/utils';

export function sanitizeQuery(rawQuery: Record<string, any>, accountability?: Accountability | null): Query {
	const query: Query = {};

	if (rawQuery.limit !== undefined) {
		const limit = sanitizeLimit(rawQuery.limit);

		if (typeof limit === 'number') {
			query.limit = limit;
		}
	}

	if (rawQuery.fields) {
		query.fields = sanitizeFields(rawQuery.fields);
	}

	if (rawQuery.groupBy) {
		query.group = sanitizeFields(rawQuery.groupBy);
	}

	if (rawQuery.aggregate) {
		query.aggregate = sanitizeAggregate(rawQuery.aggregate);
	}

	if (rawQuery.sort) {
		query.sort = sanitizeSort(rawQuery.sort);
	}

	if (rawQuery.filter) {
		query.filter = sanitizeFilter(rawQuery.filter, accountability || null);
	}

	if (rawQuery.offset) {
		query.offset = sanitizeOffset(rawQuery.offset);
	}

	if (rawQuery.page) {
		query.page = sanitizePage(rawQuery.page);
	}

	if (rawQuery.meta) {
		query.meta = sanitizeMeta(rawQuery.meta);
	}

	if (rawQuery.search && typeof rawQuery.search === 'string') {
		query.search = rawQuery.search;
	}

	if (rawQuery.export) {
		query.export = rawQuery.export as 'json' | 'csv';
	}

	if (rawQuery.deep as Record<string, any>) {
		if (!query.deep) query.deep = {};

		query.deep = sanitizeDeep(rawQuery.deep, accountability);
	}

	if (rawQuery.alias) {
		query.alias = sanitizeAlias(rawQuery.alias);
	}

	return query;
}

function sanitizeFields(rawFields: any) {
	if (!rawFields) return;

	let fields: string[] = [];

	if (typeof rawFields === 'string') fields = rawFields.split(',');
	else if (Array.isArray(rawFields)) fields = rawFields as string[];

	// Case where array item includes CSV (fe fields[]=id,name):
	fields = flatten(fields.map((field) => (field.includes(',') ? field.split(',') : field)));

	fields = fields.map((field) => field.trim());

	return fields;
}

function sanitizeSort(rawSort: any) {
	let fields: string[] = [];

	if (typeof rawSort === 'string') fields = rawSort.split(',');
	else if (Array.isArray(rawSort)) fields = rawSort as string[];

	return fields.map((field) => {
		const order = field.startsWith('-') ? 'desc' : 'asc';
		const column = field.startsWith('-') ? field.substring(1) : field;
		return { column, order } as Sort;
	});
}

function sanitizeAggregate(rawAggregate: any): Aggregate {
	let aggregate: Aggregate = rawAggregate;

	if (typeof rawAggregate === 'string') {
		try {
			aggregate = JSON.parse(rawAggregate);
		} catch {
			logger.warn('Invalid value passed for filter query parameter.');
		}
	}

	for (const [operation, fields] of Object.entries(aggregate)) {
		if (typeof fields === 'string') aggregate[operation as keyof Aggregate] = (fields as string).split(',');
		else if (Array.isArray(fields)) aggregate[operation as keyof Aggregate] = fields as string[];
	}

	return aggregate as Aggregate;
}

function sanitizeFilter(rawFilter: any, accountability: Accountability | null) {
	let filters: Filter = rawFilter;

	if (typeof rawFilter === 'string') {
		try {
			filters = JSON.parse(rawFilter);
		} catch {
			logger.warn('Invalid value passed for filter query parameter.');
		}
	}

	filters = deepMap(filters, (val) => {
		try {
			const parsed = JSON.parse(val);

			if (typeof parsed == 'number' && !Number.isSafeInteger(parsed)) return val;

			return parsed;
		} catch {
			return val;
		}
	});

	filters = parseFilter(filters, accountability);

	return filters;
}

function sanitizeLimit(rawLimit: any) {
	if (rawLimit === undefined || rawLimit === null) return null;
	return Number(rawLimit);
}

function sanitizeOffset(rawOffset: any) {
	return Number(rawOffset);
}

function sanitizePage(rawPage: any) {
	return Number(rawPage);
}

function sanitizeMeta(rawMeta: any) {
	if (rawMeta === '*') {
		return Object.values(Meta);
	}

	if (rawMeta.includes(',')) {
		return rawMeta.split(',');
	}

	if (Array.isArray(rawMeta)) {
		return rawMeta;
	}

	return [rawMeta];
}

function sanitizeDeep(deep: Record<string, any>, accountability?: Accountability | null) {
	const result: Record<string, any> = {};

	if (typeof deep === 'string') {
		try {
			deep = JSON.parse(deep);
		} catch {
			logger.warn('Invalid value passed for deep query parameter.');
		}
	}

	parse(deep);

	return result;

	function parse(level: Record<string, any>, path: string[] = []) {
		const parsedLevel: Record<string, any> = {};

		for (const [key, value] of Object.entries(level)) {
			if (!key) break;

			if (key.startsWith('_')) {
				// Sanitize query only accepts non-underscore-prefixed query options
				const parsedSubQuery = sanitizeQuery({ [key.substring(1)]: value }, accountability);
				// ...however we want to keep them for the nested structure of deep, otherwise there's no
				// way of knowing when to keep nesting and when to stop
				parsedLevel[key] = Object.values(parsedSubQuery)[0];
			} else {
				parse(value, [...path, key]);
			}
		}

		if (Object.keys(parsedLevel).length > 0) {
			set(result, path, merge({}, get(result, path, {}), parsedLevel));
		}
	}
}

function sanitizeAlias(rawAlias: any) {
	let alias: Record<string, string> = rawAlias;

	if (typeof rawAlias === 'string') {
		try {
			alias = JSON.parse(rawAlias);
		} catch (err) {
			logger.warn('Invalid value passed for alias query parameter.');
		}
	}

	return alias;
}
