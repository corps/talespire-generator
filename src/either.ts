import {isSome, Maybe} from "./maybe";

export type Either<R, L> = [R] | [null, L];

export function right<V, G = any>(r: V): Either<V, G> {
	return [r];
}

export function left<V, G = any>(l: V): Either<G, V> {
	return [null, l];
}

export function mapRight<A, B, G>(f: (a: A) => B): (a: Either<A, G>) => Either<B, G>;
export function mapRight<A, B, G>(f: (a: A) => B, t: Either<A, G>): Either<B, G>;
export function mapRight<A, B, G>(f: (a: A) => B, t?: Either<A, G>) {
	const mapper = (v: Either<A, G>): Either<B, G> => {
		if (v.length === 1) return [f(v[0])];
		return v;
	}

	if (Array.isArray(t)) return mapper(t);
	return mapper;
}

export function compose<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C {
	return (a: A) => g(f(a));
}

export function mapLeft<A, B, G>(f: (b: G) => B): (v: Either<A, G>) => Either<A, B>;
export function mapLeft<A, B, G>(f: (b: G) => B, v: Either<A, G>): Either<A, B>;
export function mapLeft<A, B, G>(f: (b: G) => B, v?: Either<A, G>) {
	const mapper = (v: Either<A, G>): Either<A, B> => {
		if (v.length === 2) return [null, f(v[1])];
		return v;
	}

	if (v) return mapper(v);

	return mapper;
}

export function joinLeftRight<A, AA, B>(fr: (a: A) => B, fl: (a: AA) => B): (a: Either<A, AA>) => B;
export function joinLeftRight<A, AA, B>(fr: (a: A) => B, fl: (a: AA) => B, a: Either<A, AA>): B;
export function joinLeftRight<A, AA, B>(fr: (a: A) => B, fl: (a: AA) => B, a?: Either<A, AA>) {
	const mapper = (v: Either<A, AA>): B => {
		if (v.length === 1) return fr(v[0]);
		return fl(v[1]);
	}

	if (a) return mapper(a);
	return mapper;
}

export function bindRight<A, B, G>(f: (a: A) => Either<B, G>): (a: Either<A, G>) => Either<B, G>;
export function bindRight<A, B, G>(f: (a: A) => Either<B, G>, t: Either<A, G>): Either<B, G>;
export function bindRight<A, B, G>(f: (a: A) => Either<B, G>, t?: Either<A, G>) {
	const mapper = (a: Either<A, G>): Either<B, G> => {
		if (a.length === 1) {
			return f(a[0]);
		}

		return a;
	}

	if (Array.isArray(t)) return mapper(t) as any;
	return mapper as any;
}

export function applyRight<A, B, G>(f: Either<(a: A) => B, G>, a: Either<A, G>): Either<B, G> {
	if (f.length === 1) {
		if (a.length === 1) {
			return [f[0](a[0])];
		}

		return a;
	}

	return f;
}

export function isRight(v: Either<any, any>): boolean {
	return v && v.length === 1;
}

export function catchErr<T>(t: () => T): Either<T, string> {
	try {
		return right(t());
	} catch (e) {
		console.error(e);
		return left(e + "")
	}
}
