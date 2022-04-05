import {BitView, JsonDataAcccesor, jsonAny, jsonEncoder, jsonNumber, jsonUndefined, jsonBoolean, jsonString, jsonNull} from "./autoproto";
import {right} from "./either";
const {jsonObj, jsonDict, jsonArray, jsonScalar} = JsonDataAcccesor;

function testJsonAccessor<V>(accessor: JsonDataAcccesor<V>, v: V, expected: any = v) {
	const encoded = accessor.encode(v, (s) => new Array(s));
	expect(accessor.decode(encoded, encoded.length)).toEqual(expected);
}

describe('JsonDataAccessor', () => {
	describe('jsonScalar', () => {
		it('works', () => {
			testJsonAccessor(jsonScalar, [["string", "hello"]])
			testJsonAccessor(jsonScalar, [["array", 2], ["number", 3], ["number", 6]])
		})
	})
	describe('jsonString', () => {
		it('works', () => {
			testJsonAccessor(jsonString, right("hello"))
		})
	})
	describe('a complex example', () => {
		it('works', () => {
			const reader = jsonObj({
				version: jsonNumber,
				elements: jsonArray(jsonArray(jsonDict(jsonObj({
					a: jsonString,
					b: jsonNull,
				}))))
			})
			const value = {
				version: 12,
				elements: [[], [{}, {vv: {a: "asdf", b: null}}]]
			};
			const spine = jsonEncoder.encode(value, (v) => new Array(v));

			const decoded = reader.decode(spine, spine.length);
			expect(decoded).toEqual({});
		})

	})
})

describe('BitView', () => {
	describe('read', () => {
		it('works', () => {
			const view = new BitView(new DataView(new Uint8Array([15, 255, 31 + 64]).buffer))
			expect(view.read(0, 2)).toEqual(3)
			expect(view.read(2, 2)).toEqual(3)
			expect(view.read(4, 2)).toEqual(0)
			expect(view.read(6, 2)).toEqual(0)
			expect(view.read(8, 2)).toEqual(3)
			expect(view.read(10, 2)).toEqual(3)
			expect(view.read(12, 2)).toEqual(3)
			expect(view.read(14, 2)).toEqual(3)
			expect(view.read(16, 2)).toEqual(3)
			expect(view.read(18, 2)).toEqual(3)
			expect(view.read(20, 2)).toEqual(1)
			expect(view.read(22, 2)).toEqual(1)

			expect(view.read(0, 3)).toEqual(7)
			expect(view.read(3, 15)).toEqual(32737)
			expect(view.read(18, 6)).toEqual(23)
		})
	})

	describe('write', () => {
		it('works', () => {
			const view = new BitView(new DataView(new Uint8Array([0, 0, 0]).buffer))
			view.write(3, 15, 32737)
			expect([...new Uint8Array(view.dv.buffer)]).toEqual([8, 255, 3])
			view.write(0, 3, 7);
			expect([...new Uint8Array(view.dv.buffer)]).toEqual([15, 255, 3])
			view.write(18, 6, 23);
			expect([...new Uint8Array(view.dv.buffer)]).toEqual([15, 255, 95])
		})
	})
})
