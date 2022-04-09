import {
	BitView,
	JsonDataAcccesor,
	jsonAny,
	jsonNumber,
	jsonUndefined,
	jsonBoolean,
	jsonString,
	jsonNull, JsonErrorResult
} from "./autoproto";
import {left, right} from "./either";
const {jsonObj, jsonDict, jsonArray, jsonScalar, jsonTuple, unwrap, fillOut} = JsonDataAcccesor;

function testJsonAccessor<V>(accessor: JsonDataAcccesor<V>, v: V, expected: any = v, m: any = undefined) {
	let encoded = accessor.encode(v, (s) => new Array(s));
	expect(accessor.decode(encoded, encoded.length)).toEqual(expected);
	if (m) {
		encoded = jsonAny.encode(m, (s) => new Array(s));
		console.log(encoded)
		expect(accessor.decode(encoded, encoded.length)).toEqual(expected);
	}
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

	describe('jsonNull', () => {
		it('works', () => {
			testJsonAccessor(jsonNull, right(null))
		})
	})

	describe('jsonArray', () => {
		it('works', () => {
			testJsonAccessor(jsonArray(jsonString), right([right("a"), right("b"), right("c")]));
		})
	});

	describe('jsonDict', () => {
		it('works', () => {
			testJsonAccessor(jsonDict(jsonString), right({a: right("a"), b: right("b"), c: right("c") }));
			testJsonAccessor(jsonDict(jsonString),
				right({a: left<JsonErrorResult, string>([[["string", "a"]], "invalid_type"]), b: right("b"), c: right("c") }),
				right({a: right("a"), b: right("b"), c: right("c") }),
				{a: "a", b: "b", c: "c"}
			);
		})
	});

	describe('jsonObj', () => {
		it('works with extra keys', () => {
			testJsonAccessor(jsonArray(jsonObj({})), right([right({a: right({z: 2, b: 3})}), right({b: right(2)})]),
				right([
					right({a: left([[["dict", ["z", "b"]], ["number", 2], ["number", 3]], ["extra_key", "a"]])}),
					right({b: left([[["number", 2]], ["extra_key", "b"]])}),
				]), [{a: {z: 2, b: 3}}, {b: 2}]);
		})
	})

	describe('a complex example', () => {
		it('works', () => {
			const reader = jsonObj({
				version: jsonTuple(jsonNumber, jsonString),
				elements: jsonArray(jsonArray(jsonDict(jsonObj({
					a: jsonString,
					b: jsonNull,
				}))))
			});

			const value = {
				version: [12, "asdf"],
				elements: [[], [{}, {vv: {a: "asdf", b: null}}]]
			};

			const spine = jsonAny.encode(value, (v) => new Array(v));
			const decoded = unwrap(reader.decode(spine, spine.length));
			const version = unwrap(decoded.version);
			const elements = unwrap(decoded.elements);

			expect(unwrap(version[0])).toEqual(value.version[0])
			expect(unwrap(version[1])).toEqual(value.version[1])
			expect(elements.map(unwrap).map(e => e.map(unwrap))).toEqual([
				[],
				[{}, {vv: right({a: right("asdf"), b: right(null)})}]
			])
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
