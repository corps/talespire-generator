import {AutoInput} from "./autoinputs";

function tail<P extends any[], T>(list: [...P, T]): [P, T] {
	const last: T = list[list.length - 1];
	return [list.slice(0, list.length - 1) as any, last];
}

type Writer = (dv: DataView) => void;
type Read<State> = (idx: number, dv: DataView) => [State, number];
type Write<State> = (idx: number, state: State) => [number, Writer];

type UnwrapDataAccessorTuple<T> = T extends [DataViewAccessor<infer Head>, ...infer Tail] ?
	[Head, ...UnwrapDataAccessorTuple<Tail>] :
	[];

export class DataViewAccessor<State> {
	constructor(public read: Read<State>, public write: Write<State>) {
	}

	static read(signed: boolean, bytes: number, endianness: boolean = true): DataViewAccessor<number> {
		return new DataViewAccessor<number>((idx: number, dv: DataView) => {
				if (idx + bytes >= dv.buffer.byteLength) {
					throw new Error('Unexpected EOF!');
				}

				let value: number = 0;
				if (signed) {
					switch (bytes) {
						case 1:
							value = dv.getInt8(idx);
							break;
						case 2:
							value = dv.getInt16(idx, endianness);
							break;
						case 4:
							value = dv.getInt32(idx, endianness);
							break;
						default:
							throw new Error('Unexpected size ' + bytes + ' bytes');
					}
				} else {
					switch (bytes) {
						case 1:
							value = dv.getUint8(idx);
							break;
						case 2:
							value = dv.getUint16(idx, endianness);
							break;
						case 4:
							value = dv.getUint32(idx, endianness);
							break;
						default:
							throw new Error('Unexpected size ' + bytes + ' bytes');
					}
				}

				return [value, idx + bytes];
			}, (idx: number, value: number) => {
				return [
					idx + bytes, (dv: DataView) => {
						if (signed) {
							switch (bytes) {
								case 1:
									dv.setInt8(idx, value);
									break;
								case 2:
									dv.setInt16(idx, value, endianness);
									break;
								case 4:
									dv.setInt32(idx, value, endianness);
									break;
								default:
									throw new Error('Unexpected size ' + bytes + ' bytes');
							}
						} else {
							switch (bytes) {
								case 1:
									dv.setUint8(idx, value);
									break;
								case 2:
									dv.setUint16(idx, value, endianness);
									break;
								case 4:
									dv.setUint32(idx, value, endianness);
									break;
								default:
									throw new Error('Unexpected size ' + bytes + ' bytes');
							}
						}
					}
				]
			});
	}

	map<R>(
		mapped: (i: State) => R,
		reverse: (r: R) => State
	) {
		return new DataViewAccessor<R>(
			(idx, dv) => {
				const [s, i] = this.read(idx, dv);
				return [mapped(s), i];
			},
			(idx, r) => {
				return this.write(idx, reverse(r));
			}
		)
	}

	static lift<V>(v: V) {
		return new DataViewAccessor<V>((idx) => [v, idx], (idx) => [idx, () => null])
	}

	then<R>(
		accessor: (i: State) => DataViewAccessor<R>,
		reverse: (r: R) => State,
	) {
		return new DataViewAccessor<R>(
			(idx, dv) => {
				const [s, i] = this.read(idx, dv);
				const [ss, ii] = accessor(s).read(i, dv);
				return [ss, ii];
			},
			(idx, r) => {
				const s = reverse(r);
				const {write} = accessor(s);
				const [i, w] = this.write(idx, s)
				const [ii, ww] = write(i, r);
				return [
					ii,
					(dv) => {
						w(dv);
						ww(dv);
					}
				]
			}
		)
	}

	repeat<Counter>(cnt: DataViewAccessor<number>): DataViewAccessor<State[]> {
		return new DataViewAccessor<State[]>(
			(idx, dv) => {
				const results: State[] = [];
				const [itemCnt, i] = cnt.read(idx, dv);
				idx = i;
				for (let j = 0; j < itemCnt; ++j) {
					const [n, i] = this.read(idx, dv);
					results.push(n);
					idx = i;
				}

				return [results, idx];
			},
			(idx, items) => {
				const writers: Writer[] = [];

				const [n, w] = cnt.write(idx, writers.length);
				writers.push(w);
				idx = n;

				items.forEach((i) => {
					const [n, w] = this.write(idx, i);
					writers.push(w);
					idx = n;
				})

				return [idx, (dv) => writers.forEach(w => w(dv))];
			}
		)
	}

	static tuple<P extends DataViewAccessor<any>[]>(...accessors: P): DataViewAccessor<UnwrapDataAccessorTuple<P>> {
		return new DataViewAccessor<UnwrapDataAccessorTuple<P>>(
			(idx, dv) => {
				const result: any[] = [];
				accessors.forEach(a => {
					const [n, i] = a.read(idx, dv);
					result.push(n);
					idx = i;
				})

				return [result as UnwrapDataAccessorTuple<P>, idx];
			},
			(idx, items) => {
				const writers: Writer[] = [];
				accessors.forEach((a, i) => {
					const [n, w] = a.write(idx, items[i]);
					writers.push(w);
					idx = n;
				})

				return [idx, (dv) => writers.forEach(w => w(dv))];
			}
		)
	}

	decode(dv: DataView): State {
		return this.read(0, dv)[0];
	}

	encode(state: State): DataView {
		const [size, writer] = this.write(0, state);
		const array = new Uint8Array(size);
		const dv = new DataView(array);
		writer(dv);
		return dv;
	}
}


