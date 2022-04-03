import {compress, decompress, slab} from "./slab-decoder";
import {mapSome, withDefault} from "./maybe";
import {DataAccessor} from "./autoproto";

function testWithSlab(s: string, expectation: any) {
	// expect(withDefault(mapSome(decompress(s), s => compress(s)), "")).toEqual(s)
	const r = mapSome(decompress(s), (v) => slab.decode(v, true));
	expect(r).toEqual(expectation);
	const rencoded = withDefault(mapSome(r, r => compress(slab.encode(r))), "");
	// expect(rencoded).toEqual(s);
	expect(decompress(s)).toEqual(decompress(rencoded))
	const rr = mapSome(decompress(rencoded), (v) => slab.decode(v, true));
	expect(rr).toEqual(expectation);
}

describe('slab-decoder', () => {
	describe('v2', () => {
		it('works', () =>{
			testWithSlab(
				"H4sIAAAAAAAACzv369xFJgYmBgaG7pL+4F2SeZ7t9wUSuyZLlDACxXYovn/klGjqOCNyUuOKTWF/QOr6gRIBgg4sQCZDAKsDkzQziOUAlAIAoQYiAEwAAAA=",
					[
						{
							"assets": [
								{
									"id": "00008b74-8f53-ba19-6e49-87df10618a93-1874",
									"positions": [
										{
											"rot": 1088,
											"x": 399,
											"z": 0,
											"y": 4432
										}
									]
								},
								{
									"id": "0000b821-efe2-4261-3541-98599281a8b2-56fc",
									"positions": [
										{
											"rot": 576,
											"x": 0,
											"z": 0,
											"y": 1360
										},
										{
											"rot": 576,
											"x": 795,
											"z": 0,
											"y": 0
										}
									]
								}
							],
							"version": 2
						}
					]
			)
		})
	})
})
