type Writer = (dv: DataView) => void;
type Read<State> = (idx: number, dv: DataView) => [State, number];
type Write<State> = (idx: number, state: State) => [number, Writer];

type UnwrapDataAccessorTuple<T> = T extends [DataViewAccessor<infer Head>, ...infer Tail] ?
	[Head, ...UnwrapDataAccessorTuple<Tail>] :
	[];

type UnwrapDataAccessorRecord<T extends Record<string, DataViewAccessor<any>>> = {
	[A in keyof T]: UnwrapDataViewAccessor<T[A]>
}

export type UnwrapDataViewAccessor<T extends DataViewAccessor<any>> = T extends DataViewAccessor<infer O> ? O : never;

export class DataViewAccessor<State> {
	constructor(public read: Read<State>, public write: Write<State>, public d: State) {
	}

	static read(signed: boolean, bytes: number, float: boolean = false, endianness: boolean = true): DataViewAccessor<number> {
		return new DataViewAccessor<number>((idx: number, dv: DataView) => {
				if (idx + bytes > dv.buffer.byteLength) {
					throw new Error('Unexpected EOF!');
				}

				let value: number = 0;
				if (signed) {
					switch (`${bytes}-${float}`) {
						case "1-false":
							value = dv.getInt8(idx);
							break;
						case "2-false":
							value = dv.getInt16(idx, endianness);
							break;
						case "4-false":
							value = dv.getInt32(idx, endianness);
							break;
						case "4-true":
							value = dv.getFloat32(idx, endianness);
							break;
						case "8-true":
							value = dv.getFloat64(idx, endianness);
							break;
						default:
							throw new Error(`Invalid target signed=${signed}, float=${float}, bytes=${bytes}`)
					}
				} else {
					switch (`${bytes}-${float}`) {
						case "1-false":
							value = dv.getUint8(idx);
							break;
						case "2-false":
							value = dv.getUint16(idx, endianness);
							break;
						case "4-false":
							value = dv.getUint32(idx, endianness);
							break;
						default:
							throw new Error(`Invalid target signed=${signed}, float=${float}, bytes=${bytes}`)
					}
				}

				return [value, idx + bytes];
			}, (idx: number, value: number) => {
				return [
					idx + bytes, (dv: DataView) => {
						if (signed) {
							switch (`${bytes}-${float}`) {
								case "1-false":
									dv.setInt8(idx, value);
									break;
								case "2-false":
									dv.setInt16(idx, value, endianness);
									break;
								case "4-false":
									dv.setInt32(idx, value, endianness);
									break;
								case "4-true":
									dv.setFloat32(idx, value, endianness);
									break;
								case "8-true":
									dv.setFloat64(idx, value, endianness);
									break;
								default:
									throw new Error(`Invalid target signed=${signed}, float=${float}, bytes=${bytes}`)
							}
						} else {
							switch (`${bytes}-${float}`) {
								case "1-false":
									dv.setUint8(idx, value);
									break;
								case "2-false":
									dv.setUint16(idx, value, endianness);
									break;
								case "4-false":
									dv.setUint32(idx, value, endianness);
									break;
								default:
									throw new Error(`Invalid target signed=${signed}, float=${float}, bytes=${bytes}`)
							}
						}
					}
				]
			}, 0);
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
			}, mapped(this.d)
		)
	}

	static lift<V>(v: V) {
		return new DataViewAccessor<V>((idx) => [v, idx], (idx) => [idx, () => null], v)
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
			}, accessor(this.d).d
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

				const [n, w] = cnt.write(idx, items.length);
				writers.push(w);
				idx = n;

				items.forEach((i) => {
					const [n, w] = this.write(idx, i);
					writers.push(w);
					idx = n;
				})

				return [idx, (dv) => writers.forEach(w => w(dv))];
			}, []
		)
	}

	static array<P>(accessors: DataViewAccessor<P>[]): DataViewAccessor<P[]> {
		return DataViewAccessor.tuple(...accessors) as any as DataViewAccessor<P[]>;
	}

	static obj<O extends Record<string, DataViewAccessor<any>>>(o: O): DataViewAccessor<UnwrapDataAccessorRecord<O>> {
		return DataViewAccessor.array(Object.keys(o).map(k =>
			DataViewAccessor.tuple(DataViewAccessor.lift(k), o[k]))).map<any>(pairs => Object.fromEntries(pairs), obj => Object.keys(o).map(k => [k, obj[k]]));
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
			}, accessors.map(({d}) => d) as any
		)
	}

	decode(dv: DataView, strict = false): State {
		const [result, idx] = this.read(0, dv);

		if (idx != dv.buffer.byteLength && strict) {
			throw new Error('Unpacked data remains! ' + (dv.buffer.byteLength - idx))
		}

		return result;
	}

	encode(state: State): DataView {
		const [size, writer] = this.write(0, state);
		const array = new Uint8Array(size);
		const dv = new DataView(array.buffer);
		writer(dv);
		return dv;
	}
}

export const byte = DataViewAccessor.read(false, 1);
export const uint16 = DataViewAccessor.read(false, 2);
export const uint32 = DataViewAccessor.read(false, 4);
export const int16 = DataViewAccessor.read(true, 2);
export const float32 = DataViewAccessor.read(true, 4, true);
