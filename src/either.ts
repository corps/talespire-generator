import {isSome, Maybe} from "./maybe";

export type Either<R, L> = [R] | [null, L];

export function right<V, G = any>(r: V): Either<V, G> {
	return [r];
}

export function left<V, G = any>(l: V): Either<G, V> {
	return [null, l];
}

export function mapRight<A, B, G>(v: Either<A, G>, f: (a: A) => B): Either<B, G> {
	if (v.length === 1) return [f(v[0])];
	return v;
}

export function accUntilLeft<A, B>(v: Either<A, B>[]): Either<A[], B> {
	const result: A[] = [];
	for (let i = 0; i < v.length; ++i) {
		const n = v[i];
		if (n.length === 1) {
			result.push(n[0]);
		} else {
			return left(n[1]);
		}
	}

	return right(result);
}

export function biMap<A, B, AA, BB>(v: Either<A, AA>, fr: (a: A) => B, fl: (a: AA) => BB): Either<B, BB> {
	if (v.length === 1) return [fr(v[0])];
	return [null, fl(v[1])];
}

export function joinLeftRight<A, AA, B>(v: Either<A, AA>, fr: (a: A) => B, fl: (a: AA) => B): B {
	if (v.length === 1) return fr(v[0]);
	return fl(v[1]);
}

export function bindRight<A, B, G>(a: Either<A, G>, f: (a: A) => Either<B, G>): Either<B, G> {
	if (a.length === 1) {
		return f(a[0]);
	}

	return a;
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

export function flipLeftRight<A, B>(a: Either<A, B>): Either<B, A> {
	if (a.length === 2) return [a[1]]
	return [null, a[0]];
}
