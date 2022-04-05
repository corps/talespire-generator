import {ReadonlyDeep} from "type-fest";
import {Maybe} from "./maybe";
import {
	accUntilLeft, applyRight, bindRight, Either, flipLeftRight, joinLeftRight, left, mapRight, right
} from "./either";

type Writer<View> = (dv: View) => void;
type Read<State, View> = (idx: number, dv: View) => [State, number];
type Write<State, View> = (idx: number, state: State) => [number, Writer<View>];

type UnwrapAccessorTuple<T> = T extends [DataAccessor<infer H, any>, ...infer Tail] ? [H, ...UnwrapAccessorTuple<Tail>] : [];

type UnwrapAccessorTupleView<T> = T extends [DataAccessor<any, infer View>, ...infer Tail] ? UnwrapAccessorTupleView_<Tail, View> : unknown;

type UnwrapAccessorTupleView_<T, View> = T extends [DataAccessor<any, View>, ...infer Tail] ? UnwrapAccessorTupleView_<Tail, View> : T extends [DataAccessor<any, any>, ...any] ? unknown : T extends [] ? View : unknown;

type UnwrapAccessorRecord<T extends Record<string, DataAccessor<any, any>>> = {
	[A in keyof T]: UnwrapAccessor<T[A]>
}

type UnwrapAccessorRecordView<T extends Record<string, DataAccessor<any, any>>> = T extends Record<string, DataAccessor<any, infer View>> ? View : unknown;

export type UnwrapAccessor<T extends DataAccessor<any, any>> = T extends DataAccessor<infer O, any> ? O : never;
export type UnwrapAccessorView<T extends DataAccessor<any, any>> = T extends DataAccessor<any, infer View> ? View : never;

function fillOut(bits: number) {
	return (1 << bits) - 1;
}

function invert(bits: number, value: number) {
	return fillOut(bits) - value;
}

function rangeMask(start: number, width: number) {
	return fillOut(width) << start;
}

function clamp(bits: number, value: number) {
	return value & fillOut(bits);
}

function copyBits(bits: number, mask: number, from: number, to: number) {
	to = clamp(bits, to);
	from = clamp(bits, from);
	return (to & (invert(bits, mask))) | (from & mask);
}

export class BitView {
	constructor(public dv: DataView, public littleEndian: boolean = true) {
	}

	get bitLength() {
		return this.dv.byteLength * 8;
	}

	public position(idx: number): [number, number] {
		let byteOffset = Math.floor(idx / 8);
		let bitOffset = idx % 8;

		if (!this.littleEndian) {
			byteOffset = this.dv.byteLength - byteOffset - 1;
		}

		return [byteOffset, bitOffset];
	}

	public read(idx: number, bits: number) {
		let v = 0;

		if (idx + bits > this.bitLength) {
			throw new Error(`Unexpected EOF! ${idx} ${bits} ${this.bitLength}`);
		}

		let pos = 0;
		while (pos < bits) {
			const [byteOffset, bitOffset] = this.position(idx + pos);
			const chunkLength = Math.min(bits - pos, 8 - bitOffset);

			v += ((this.dv.getUint8(byteOffset) & rangeMask(bitOffset, chunkLength)) >> bitOffset) << pos;
			pos += chunkLength;
		}

		return v;
	}

	public write(idx: number, bits: number, value: number) {
		if (idx + bits > this.bitLength) {
			throw new Error('Unexpected EOF!');
		}

		let pos = 0;
		while (pos < bits) {
			const [byteOffset, bitOffset] = this.position(idx + pos);
			const chunkLength = Math.min(bits - pos, 8 - bitOffset);

			let byteChunkValue = value & rangeMask(pos, chunkLength);
			byteChunkValue = byteChunkValue >> pos;
			byteChunkValue = byteChunkValue << bitOffset;

			this.dv.setUint8(byteOffset,
				copyBits(8, rangeMask(bitOffset, chunkLength), byteChunkValue, this.dv.getUint8(byteOffset))
			);

			pos += chunkLength;
		}
	}
}

// 1 2 [0, 3]


// export class JsonView {
// 	constructor(public data: any, public d: any) {
// 	}
//
// 	static undefined: JsonSpineAtom = [[], undefined];
// 	static null: JsonSpineAtom = [[], null];
// 	static emptyPath: any[] = [];
//
// 	read(index: number): ReadonlyArray<JsonSpineAtom> {
// 		if (index >= this.data.length) throw new Error('Unexpected EOF!');
// 		return this.data[index];
// 	}
//
// 	write(index: number, value: JsonSpineAtom) {
// 		if (index >= this.data.length) throw new Error('Unexpected EOF!');
// 		// @ts-ignore
// 		this.data[index] = value;
// 	}
//
// 	static fromLength(len: number): JsonView {
// 		return new JsonView(new Array(len));
// 	}
//
// 	static readString(expectedPath = JsonView.emptyPath) {
//
// 	}
// }

export class DataAccessor<State, View> {
	constructor(public read: Read<State, View>, public write: Write<State, View>, public d: State) {
	}

	withDefault(v: State) {
		return new DataAccessor<State, View>(this.read, this.write, v);
	}


	map<R>(mapped: (i: State, idx: number, end: number) => R, reverse: (r: R) => State) {
		return new DataAccessor<R, View>((idx, dv) => {
			const [s, i] = this.read(idx, dv);
			return [mapped(s, idx, i), i];
		}, (idx, r) => {
			return this.write(idx, reverse(r));
		}, mapped(this.d, 0, 0))
	}

	static lift<V>(v: V) {
		return new DataAccessor<V, any>((idx) => [v, idx], (idx) => [idx, () => null], v)
	}

	then<R>(accessor: (i: State, idx: number, end: number) => DataAccessor<R, View>, reverse: (r: R) => State,) {
		return new DataAccessor<R, View>((idx, dv) => {
			const [s, i] = this.read(idx, dv);
			const [ss, ii] = accessor(s, idx, i).read(i, dv);
			return [ss, ii];
		}, (idx, r) => {
			const s = reverse(r);
			const [i, w] = this.write(idx, s)
			const {write} = accessor(s, idx, i);
			const [ii, ww] = write(i, r);
			return [
				ii, (dv) => {
					w(dv);
					ww(dv);
				}
			]
		}, accessor(this.d, 0, 0).d)
	}

	repeat<Counter>(cnt: DataAccessor<number, View>): DataAccessor<State[], View> {
		return new DataAccessor<State[], View>((idx, dv) => {
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

	static array<P, View>(accessors: DataAccessor<P, View>[]): DataAccessor<P[], View> {
		return DataAccessor.tuple(...accessors) as any as DataAccessor<P[], View>;
	}

	static obj<O extends Record<string, DataAccessor<any, any>>>(o: O): DataAccessor<UnwrapAccessorRecord<O>, UnwrapAccessorRecordView<O>> {
		return DataAccessor.array<any, UnwrapAccessorRecordView<O>>(Object.keys(o)
				.map(k => DataAccessor.tuple(DataAccessor.lift(k), o[k])))
			.map<any>(pairs => Object.fromEntries(pairs), obj => Object.keys(o).map(k => [k, obj[k]]));
	}

	static group<P extends DataAccessor<any, any>>(accessors: P[]): DataAccessor<UnwrapAccessor<P>[], UnwrapAccessorView<P>> {
		return DataAccessor.tuple(...accessors) as any;
	}

	static tuple<P extends DataAccessor<any, any>[]>(...accessors: P): DataAccessor<UnwrapAccessorTuple<P>, UnwrapAccessorTupleView<P>> {
		return new DataAccessor<UnwrapAccessorTuple<P>, UnwrapAccessorTupleView<P>>((idx, dv) => {
			const result: any[] = [];
			accessors.forEach(a => {
				const [n, i] = a.read(idx, dv);
				result.push(n);
				idx = i;
			})

			return [result as UnwrapAccessorTuple<P>, idx];
		}, (idx, items) => {
			const writers: Writer<UnwrapAccessorTupleView<P>>[] = [];
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

export function unpack(bits: number): DataAccessor<number, BitView> {
	return new DataAccessor<number, BitView>((idx, dv: BitView) => {
		return [dv.read(idx, bits), idx + bits];
	}, (idx, num) => {
		return [
			idx + bits, (dv: BitView) => {
				dv.write(idx, bits, num);
			}
		]
	}, 0)
}

export function pack<T>(bytes: number,
	accessor: DataAccessor<T, BitView>,
	littleEndian = true
): DataAccessor<T, DataView> {
	return new DataAccessor<T, DataView>((idx, dv) => {
		dv = new DataView(dv.buffer, idx);
		const [state] = accessor.read(0, new BitView(dv, littleEndian));
		return [state, idx + bytes]
	}, (idx, v) => {
		return [
			idx + bytes, (dv: DataView) => {
				dv = new DataView(dv.buffer, idx);
				accessor.write(0, v)[1](new BitView(dv, littleEndian));
			}
		]
	}, accessor.d)
}

function read(signed: boolean,
	bytes: number,
	float: boolean = false,
	littleEndian: boolean = true
): DataAccessor<number, DataView> {
	return new DataAccessor<number, DataView>((idx: number, dv: DataView) => {
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
					value = dv.getInt16(idx, littleEndian);
					break;
				case "4-false":
					value = dv.getInt32(idx, littleEndian);
					break;
				case "4-true":
					value = dv.getFloat32(idx, littleEndian);
					break;
				case "8-true":
					value = dv.getFloat64(idx, littleEndian);
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
					value = dv.getUint16(idx, littleEndian);
					break;
				case "4-false":
					value = dv.getUint32(idx, littleEndian);
					break;
				default:
					throw new Error(`Invalid target signed=${signed}, float=${float}, bytes=${bytes}`)
			}
		}

		return [value, idx + bytes];
	}, (idx: number, value: number) => {
		return [
			idx + bytes, (dv: DataView) => {
				if (idx + bytes > dv.buffer.byteLength) {
					throw new Error('Unexpected EOF!');
				}

				if (signed) {
					switch (`${bytes}-${float}`) {
						case "1-false":
							dv.setInt8(idx, value);
							break;
						case "2-false":
							dv.setInt16(idx, value, littleEndian);
							break;
						case "4-false":
							dv.setInt32(idx, value, littleEndian);
							break;
						case "4-true":
							dv.setFloat32(idx, value, littleEndian);
							break;
						case "8-true":
							dv.setFloat64(idx, value, littleEndian);
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
							dv.setUint16(idx, value, littleEndian);
							break;
						case "4-false":
							dv.setUint32(idx, value, littleEndian);
							break;
						default:
							throw new Error(`Invalid target signed=${signed}, float=${float}, bytes=${bytes}`)
					}
				}
			}
		]
	}, 0);
}

export const byte = read(false, 1);
export const uint16 = read(false, 2);
export const uint32 = read(false, 4);
export const int16 = read(true, 2);
export const float32 = read(true, 4, true);


export type JsonSpineType = "number" | "array" | "string" | "boolean" | "dict" | undefined | null;
export type JsonSpineValue<T> = T extends "number" ? number : T extends "array" ? number : T extends "string" ? string : T extends "boolean" ? boolean : T extends "dict" ? string[] : T extends null ? null : T extends undefined ? undefined : unknown;
export type JsonSpineAtom<T extends JsonSpineType> = T extends string ? [T, JsonSpineValue<T>] : T;
export type AnyJsonSpineAtom =
	JsonSpineAtom<"number">
	| JsonSpineAtom<"string">
	| JsonSpineAtom<"boolean">
	| JsonSpineAtom<"dict">
	| JsonSpineAtom<"array">
	| JsonSpineAtom<undefined>
	| JsonSpineAtom<null>;
type JsonScalar = [AnyJsonSpineAtom, ...AnyJsonSpineAtom[]];
export type JsonSpine = AnyJsonSpineAtom[];

export type JsonError = "invalid_type" | ["missing_key", string] | ["extra_key", string];
export type JsonErrorResult = [JsonScalar, JsonError];
export type JsonResult<T> = Either<T, JsonErrorResult>


export class JsonDataAcccesor<T> extends DataAccessor<T, JsonSpine> {
	static readChunk<T extends JsonSpineType>(example: JsonSpineAtom<T>): JsonDataAcccesor<JsonResult<JsonSpineValue<T>>> {
		const {jsonScalar, lift} = JsonDataAcccesor;
		return jsonScalar.then((scalar, start, end) => {
			const [head] = scalar;
			if (Array.isArray(head)) {
				if (Array.isArray(example)) {
					if (example[0] === head[0]) {
						return new JsonDataAcccesor<JsonResult<JsonSpineValue<T>>>((idx, dv) => [right<any, any>(head[1]), start + 1],
							(idx, v) => [start, (dv) => null],
							right<any, any>(head[1]),
						);
					}
				}
			} else if (head === example) {
				return new JsonDataAcccesor<JsonResult<JsonSpineValue<T>>>((idx, dv) => [right<any, any>(head), start + 1],
					(idx, v) => [start, (dv) => null],
					right<any, any>(head),
				);
			}

			return lift(left<[JsonScalar, JsonError], JsonSpineValue<T>>([scalar, "invalid_type"]));
		}, res => joinLeftRight(res, head => {
			console.log({example, head})
			if (Array.isArray(example)) {
				return [[example[0], head]] as JsonScalar
			}

			return [head] as JsonScalar;
		}, ([scalar]) => scalar));
	}

	static defaultFor<T extends JsonSpineType>(v: JsonSpineAtom<T>): JsonSpineValue<T> {
		if (Array.isArray(v)) {
			return v[1] as any;
		}

		return v as any;
	}

	static jsonScalar = new JsonDataAcccesor<JsonScalar>((idx, dv) => {
		const {jsonScalar, lift} = JsonDataAcccesor;
		const v = dv[idx];
		let end = idx + 1;
		if (Array.isArray(v)) {
			if (v[0] === "array") {
				const [_, i] = jsonScalar.repeat(lift(v[1])).read(end, dv);
				end = i;
			}

			if (v[1] === "dict") {
				const [_, i] = jsonScalar.repeat(lift(v[1].length)).read(end, dv);
				end = i;
			}
		}

		return [dv.slice(idx, end) as [AnyJsonSpineAtom, ...AnyJsonSpineAtom[]], end];
	}, (idx, v) => {
		return [
			idx + v.length, (dv) => {
				v.forEach((v, i) => dv[idx + i] = v)
			}
		];
	}, [undefined])

	static liftSuccess<T>(t: JsonDataAcccesor<T>): JsonDataAcccesor<JsonResult<T>> {
		const {joinWith} = JsonDataAcccesor;
		return joinWith(right(t));
	}

	static liftError<T = any>(err: JsonErrorResult): JsonDataAcccesor<JsonResult<T>> {
		const {joinWith} = JsonDataAcccesor;
		return joinWith(left<JsonErrorResult, any>(err));
	}

	static joinWith<T>(r: JsonResult<JsonDataAcccesor<T>>): JsonDataAcccesor<JsonResult<T>> {
		const {lift} = JsonDataAcccesor;
		return joinLeftRight<JsonDataAcccesor<T>, JsonErrorResult, JsonDataAcccesor<JsonResult<T>>>(r,
			accessor => accessor.map(result => right(result), result => joinLeftRight(result, v => v, err => accessor.d),),
			err => lift(left(err))
		)
	}

	static jsonArray<T>(v: JsonDataAcccesor<JsonResult<T>>): JsonDataAcccesor<JsonResult<JsonResult<T>[]>> {
		const {lift, joinWith} = JsonDataAcccesor;
		return JsonDataAcccesor.readChunk(["array", 0])
			.then(cnt => joinWith(mapRight(cnt, cnt => v.repeat(lift(cnt)))), v => mapRight(v, (v) => v.length));
	}

	static jsonDict<T>(v: JsonDataAcccesor<JsonResult<T>>): JsonDataAcccesor<JsonResult<Record<string, JsonResult<T>>>> {
		const {readChunk, lift, joinWith} = JsonDataAcccesor;
		return readChunk(["dict", []]).then(keys => joinWith(mapRight(keys, keys => v
				.repeat(lift(keys.length))
				.map<Record<string, JsonResult<T>>>(values => Object.fromEntries(values.map((v, i) => [keys[i], v])),
					o => Object.values(o)
				))),
			v => mapRight(v, (v) => Object.keys(v)),
		);
	}

	static jsonObj<O extends Record<string, JsonDataAcccesor<JsonResult<any>>>>(o: O): JsonDataAcccesor<JsonResult<UnwrapAccessorRecord<O>>> {
		const {lift, group, jsonScalar, joinWith, tuple} = JsonDataAcccesor;
		return JsonDataAcccesor.readChunk(["dict", []])
			.then(keys => joinWith(mapRight<string[], JsonDataAcccesor<UnwrapAccessorRecord<O>>, JsonErrorResult>(keys,
				keys => {
					const fields: JsonDataAcccesor<[string, JsonResult<any>]>[] = [];
					const missing = {...o};

					keys.forEach(k => {
						if (k in o) {
							fields.push(tuple(lift(k), o[k]));
							delete missing[k];
						} else {
							fields.push(jsonScalar.map(s => [k, left<JsonErrorResult, any>([s, ["extra_key", k]])],
								(v) => joinLeftRight(v[1], r => [null], ([l]) => l)
							));
						}
					})

					Object.keys(missing).forEach(k => {
						fields.push(jsonScalar.map(s => [k, left<JsonErrorResult, any>([s, ["missing_key", k]])],
							(v) => joinLeftRight(v[1], r => [null], ([l]) => l)
						));
					});

					return group(fields)
						.map(entries => Object.fromEntries(entries) as UnwrapAccessorRecord<O>, o => Object.entries(o));
				}
			)), (maybeParts) => {
				return mapRight(maybeParts, parts => Object.keys(parts));
			})
	}

	static jsonOr(a: Read<JsonResult<any>, JsonSpine>,
		b: Read<JsonResult<any>, JsonSpine>
	): Read<JsonResult<any>, JsonSpine> {
		return (idx, dv) => {
			const [r, i] = a(idx, dv);
			return joinLeftRight(r, r => [r, i], e => b(idx, dv));
		};
	}
}

export const jsonString = JsonDataAcccesor.readChunk(["string", ""])
export const jsonNumber = JsonDataAcccesor.readChunk(["number", 0])
export const jsonBoolean = JsonDataAcccesor.readChunk(["boolean", false])
export const jsonUndefined = JsonDataAcccesor.readChunk(undefined);
export const jsonNull = JsonDataAcccesor.readChunk(null);
export const jsonAny: JsonDataAcccesor<JsonResult<any>> = new JsonDataAcccesor<JsonResult<any>>((idx, dv) => {
	const {jsonOr, jsonArray, jsonDict} = JsonDataAcccesor;
	return jsonOr(jsonOr(
		jsonOr(
			jsonOr(jsonOr(jsonOr(jsonNumber.read, jsonString.read), jsonBoolean.read), jsonUndefined.read),
			jsonNull.read
		),
		jsonArray(jsonAny).read
	), jsonDict(jsonAny).read)(idx, dv);
}, (idx, value) => {
	const {jsonArray, jsonDict, jsonScalar} = JsonDataAcccesor;
	console.log({value})
	return joinLeftRight(value, inner => {
		if (typeof inner === "string") {
			return jsonString.write(idx, value);
		} else if (typeof inner === "number") {
			return jsonNumber.write(idx, value);
		} else if (typeof inner === "boolean") {
			return jsonNumber.write(idx, value)
		} else if (Array.isArray(inner)) {
			return jsonArray(jsonAny).write(idx, value);
		} else {
			return jsonDict(jsonAny).write(idx, value);
		}
	}, ([v]) => jsonScalar.write(idx, v))
}, right(undefined));

export const jsonEncoder: JsonDataAcccesor<any> = jsonAny.map(r => joinLeftRight(r, r => r, e => {
	throw new Error(`Invalid json!`)
}), v => right(v));
