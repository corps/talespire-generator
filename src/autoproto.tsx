type Writer<View> = (dv: View) => void;
type Read<State, View> = (idx: number, dv: View) => [State, number];
type Write<State, View> = (idx: number, state: State) => [number, Writer<View>];

interface DataAccessorInt<State, View> {
	read: Read<State, View>, write: Write<State, View>, d: State
}


type UnwrapAccessorTuple<T> = T extends [DataAccessorInt<infer H, any>, ...infer Tail] ?
	[H, ...UnwrapAccessorTuple<Tail>] :
	[];

type UnwrapAccessorRecord<T extends Record<string, DataAccessorInt<any, any>>> = {
	[A in keyof T]: UnwrapAccessor<T[A]>
}

export type UnwrapAccessor<T extends DataAccessorInt<any, any>> = T extends DataAccessorInt<infer O, any> ? O : never;

// 0001 0002 0003 0004 orig
// 0004 0003 0002 0001 little
//

function fillOut(bits: number) {
	return (1 << bits) - 1;
}

function invert(value: number, bits: number) {
	return fillOut(bits) - value;
}

function selectMask(bits: number, left: number, right: number) {
	return (fillOut(right - left) << (bits - right));
}

export class BitView {
	constructor(public dv: DataView, public endianness: boolean = true) {
	}

	get bitLength() {
		return this.dv.byteLength * 8;
	}

	public position(idx: number): [number, number] {
		let byteOffset = Math.floor(idx / 8);
		let bitOffset = idx % 8;

		if (this.endianness) {
			byteOffset = this.dv.byteLength - byteOffset - 1;
		}

		return [byteOffset, bitOffset];
	}

	public read(idx: number, bits: number) {
		let v = 0;

		if (idx + bits > this.bitLength) {
			throw new Error('Unexpected EOF!');
		}

		while (bits > 0) {
			const [byteOffset, bitOffset] = this.position(idx);
			const chunkLength = Math.min(bits, 8 - bitOffset);

			v = v << chunkLength;
			v += (this.dv.getUint8(byteOffset) & (255 >> bitOffset)) >> (8 - chunkLength - bitOffset);

			idx += chunkLength;
			bits -= chunkLength;
		}

		return v;
	}

	public write(idx: number, bits: number, value: number) {
		if (idx + bits > this.bitLength) {
			throw new Error('Unexpected EOF!');
		}

		while (bits > 0) {
			const [byteOffset, bitOffset] = this.position(idx);
			const chunkLength = Math.min(bits, 8 - bitOffset);

			let select = value & selectMask(bits, 0, chunkLength);
			select = select >> (bits - chunkLength);
			select = select << bitOffset;
			this.dv.setUint8(byteOffset, this.dv.getUint8(byteOffset) & invert(select, 8) | select)

			idx += chunkLength;
			bits -= chunkLength;
			value = value & fillOut(bits - chunkLength) // chop off chunkLength
		}
	}
}

export function MakeAccessor<View>(con: (size: number) => View, len: (view: View) => number) {
	return class DataAccessor<State> {
		constructor(public read: Read<State, View>, public write: Write<State, View>, public d: State) {
		}

		withDefault(v: State) {
			return new DataAccessor<State>(this.read, this.write, v);
		}


		map<R>(mapped: (i: State) => R, reverse: (r: R) => State) {
			return new DataAccessor<R>((idx, dv) => {
				const [s, i] = this.read(idx, dv);
				return [mapped(s), i];
			}, (idx, r) => {
				return this.write(idx, reverse(r));
			}, mapped(this.d))
		}

		static lift<V>(v: V) {
			return new DataAccessor<V>((idx) => [v, idx], (idx) => [idx, () => null], v)
		}

		then<R>(accessor: (i: State) => DataAccessor<R>, reverse: (r: R) => State,) {
			return new DataAccessor<R>((idx, dv) => {
				const [s, i] = this.read(idx, dv);
				const [ss, ii] = accessor(s).read(i, dv);
				return [ss, ii];
			}, (idx, r) => {
				const s = reverse(r);
				const {write} = accessor(s);
				const [i, w] = this.write(idx, s)
				const [ii, ww] = write(i, r);
				return [
					ii, (dv) => {
						w(dv);
						ww(dv);
					}
				]
			}, accessor(this.d).d)
		}

		repeat<Counter>(cnt: DataAccessor<number>): DataAccessor<State[]> {
			return new DataAccessor<State[]>((idx, dv) => {
				const results: State[] = [];
				const [itemCnt, i] = cnt.read(idx, dv);
				idx = i;
				for (let j = 0; j < itemCnt; ++j) {
					const [n, i] = this.read(idx, dv);
					results.push(n);
					idx = i;
				}

				return [results, idx];
			}, (idx, items) => {
				const writers: Writer<View>[] = [];

				const [n, w] = cnt.write(idx, items.length);
				writers.push(w);
				idx = n;

				items.forEach((i) => {
					const [n, w] = this.write(idx, i);
					writers.push(w);
					idx = n;
				})

				return [idx, (dv) => writers.forEach(w => w(dv))];
			}, [])
		}

		static array<P, View>(accessors: DataAccessor<P>[]): DataAccessor<P[]> {
			return DataAccessor.tuple(...accessors) as any as DataAccessor<P[]>;
		}

		static obj<O extends Record<string, DataAccessor<any>>, View>(o: O): DataAccessor<UnwrapAccessorRecord<O>> {
			return DataAccessor.array<any, View>(Object.keys(o).map(k => DataAccessor.tuple(DataAccessor.lift(k), o[k])))
				.map<any>(pairs => Object.fromEntries(pairs), obj => Object.keys(o).map(k => [k, obj[k]]));
		}

		static tuple<P extends DataAccessor<any>[]>(...accessors: P): DataAccessor<UnwrapAccessorTuple<P>> {
			return new DataAccessor<UnwrapAccessorTuple<P>>((idx, dv) => {
				const result: any[] = [];
				accessors.forEach(a => {
					const [n, i] = a.read(idx, dv);
					result.push(n);
					idx = i;
				})

				return [result as UnwrapAccessorTuple<P>, idx];
			}, (idx, items) => {
				const writers: Writer<View>[] = [];
				accessors.forEach((a, i) => {
					const [n, w] = a.write(idx, items[i]);
					writers.push(w);
					idx = n;
				})

				return [idx, (dv) => writers.forEach(w => w(dv))];
			}, accessors.map(({d}) => d) as any)
		}

		decode(dv: View, length?: number): State {
			const [result, idx] = this.read(0, dv);

			if (length != null && idx != length) {
				throw new Error('Unpacked data remains! ' + (length - idx))
			}

			return result;
		}

		encode(state: State, con: (size: number) => View): View {
			const [size, writer] = this.write(0, state);
			const dv = con(size);
			writer(dv);
			return dv;
		}
	}
}

const ByteAccessor = MakeAccessor<DataView>(
	(len) => new DataView(new Uint8Array(len)),
	(dv) => dv.byteLength
)

// const BitAccessor = MakeAccessor<BitView>(
// 	(len) => new BitView(new DataView(new Uint8Array()))
// )

// static readU(bits: number): DataAccessor<number, BitView> {
// 	return new DataAccessor<number, BitView>((idx, dv: BitView) => {
// 		return [dv.read(idx, bits), idx + bits];
// 	}, (idx, num) => {
// 		return [
// 			idx + bits, (dv: BitView) => {
// 				dv.write(idx, bits, num);
// 			}
// 		]
// 	}, 0)
// }
//
// static read(
// 	signed: boolean,
// 	bytes: number,
// 	float: boolean = false,
// 	littleEndian: boolean = true
// ): DataAccessor<number, DataView> {
// 	return new DataAccessor<number, DataView>((idx: number, dv: DataView) => {
// 		if (idx + bytes > dv.buffer.byteLength) {
// 			throw new Error('Unexpected EOF!');
// 		}
//
// 		let value: number = 0;
// 		if (signed) {
// 			switch (`${bytes}-${float}`) {
// 				case "1-false":
// 					value = dv.getInt8(idx);
// 					break;
// 				case "2-false":
// 					value = dv.getInt16(idx, littleEndian);
// 					break;
// 				case "4-false":
// 					value = dv.getInt32(idx, littleEndian);
// 					break;
// 				case "4-true":
// 					value = dv.getFloat32(idx, littleEndian);
// 					break;
// 				case "8-true":
// 					value = dv.getFloat64(idx, littleEndian);
// 					break;
// 				default:
// 					throw new Error(`Invalid target signed=${signed}, float=${float}, bytes=${bytes}`)
// 			}
// 		} else {
// 			switch (`${bytes}-${float}`) {
// 				case "1-false":
// 					value = dv.getUint8(idx);
// 					break;
// 				case "2-false":
// 					value = dv.getUint16(idx, littleEndian);
// 					break;
// 				case "4-false":
// 					value = dv.getUint32(idx, littleEndian);
// 					break;
// 				default:
// 					throw new Error(`Invalid target signed=${signed}, float=${float}, bytes=${bytes}`)
// 			}
// 		}
//
// 		return [value, idx + bytes];
// 	}, (idx: number, value: number) => {
// 		return [
// 			idx + bytes, (dv: DataView) => {
// 				if (idx + bytes > dv.buffer.byteLength) {
// 					throw new Error('Unexpected EOF!');
// 				}
//
// 				if (signed) {
// 					switch (`${bytes}-${float}`) {
// 						case "1-false":
// 							dv.setInt8(idx, value);
// 							break;
// 						case "2-false":
// 							dv.setInt16(idx, value, littleEndian);
// 							break;
// 						case "4-false":
// 							dv.setInt32(idx, value, littleEndian);
// 							break;
// 						case "4-true":
// 							dv.setFloat32(idx, value, littleEndian);
// 							break;
// 						case "8-true":
// 							dv.setFloat64(idx, value, littleEndian);
// 							break;
// 						default:
// 							throw new Error(`Invalid target signed=${signed}, float=${float}, bytes=${bytes}`)
// 					}
// 				} else {
// 					switch (`${bytes}-${float}`) {
// 						case "1-false":
// 							dv.setUint8(idx, value);
// 							break;
// 						case "2-false":
// 							dv.setUint16(idx, value, littleEndian);
// 							break;
// 						case "4-false":
// 							dv.setUint32(idx, value, littleEndian);
// 							break;
// 						default:
// 							throw new Error(`Invalid target signed=${signed}, float=${float}, bytes=${bytes}`)
// 					}
// 				}
// 			}
// 		]
// 	}, 0);
// }
// export const byte = DataAccessor.read(false, 1);
// export const uint16 = DataAccessor.read(false, 2);
// export const uint32 = DataAccessor.read(false, 4);
// export const int16 = DataAccessor.read(true, 2);
// export const float32 = DataAccessor.read(true, 4, true);
