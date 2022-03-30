export class Maybe<T> {
	constructor(public value: null | [T]) {
	}

	unwrapWithDefault(d: T): T {
		if (this.value) return this.value[0];
		return d;
	}

	mapSome<B = unknown>(f: (v: T) => B) {
		if (this.value) return new Maybe([f(this.value[0])]);
		return null;
	}

	or(other: Maybe<T>) {
		if (this.value) return this;
		return other;
	}

	apply<B>(f: Maybe<(a: T) => B>): Maybe<B> {
		if (this.value && f.value) {
			return new Maybe([f.value[0](this.value[0])]);
		}

		return nothing;
	}

	bind<B>(f: (a: T) => Maybe<B>): Maybe<B> {
		if (this.value) {
			return f(this.value[0]);
		}

		return nothing;
	}
}

export const nothing: Maybe<any> = new Maybe(null);

export function some<T>(v: T): Maybe<T> {
	return new Maybe([v]);
}
