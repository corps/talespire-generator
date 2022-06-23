export type Maybe<T> = [T] | null;

export function withDefault<T>(d: T): (v: Maybe<T>) => T;
export function withDefault<T>(d: T, v: Maybe<T>): T;
export function withDefault<T>(d: T, v?: Maybe<T>) {
	const mapper = (v: Maybe<T>): T => {
		if (v == null) return d;
		return v[0];
	}

	if (v) return mapper(v);
	return mapper;
}

export function isSome<T>(a: Maybe<T>): a is [T] {
	return a != null;
}

export function some<T>(v: T): Maybe<T> {
	return [v];
}

export function alternate<T>(a: Maybe<T>, ...alts: Maybe<T>[]): Maybe<T> {
	if (isSome(a)) return a;

	for(let alt of alts) {
		if (isSome(alt)) return alt;
	}

	return null;
}

export function maybeOfNullable<T>(v: T | null | undefined): Maybe<T> {
	if (v == null) return null;
	return [v];
}

export function mapSome<A, B>(f: (a: A) => B): (a: Maybe<A>) => Maybe<B>;
export function mapSome<A, B>(f: (a: A) => B, m: Maybe<A>): Maybe<B>;
export function mapSome<A, B>(f: (a: A) => B, m?: Maybe<A>) {
	const mapper = (a: Maybe<A>): Maybe<B> => {
		if (isSome(a)) {
			return [f(a[0])];
		}

		return null;
	}

	if (m) return mapper(m);
	return mapper;
}

export function bindSome<A, B>(f: (a: A) => Maybe<B>) {
	return (a: Maybe<A>): Maybe<B> => {
		if (isSome(a)) {
			return f(a[0]);
		}

		return null;
	}
}

export function applySome<A, B>(f: Maybe<(a: A) => B>, a: Maybe<A>): Maybe<B> {
	if (isSome(f)) {
		if (isSome(a)) {
			return [f[0](a[0])];
		}
	}

	return null;
}
