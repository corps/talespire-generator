import {compress, decompress, slab} from "./slab-decoder";
import {mapSome, withDefault} from "./maybe";
import {DataAccessor} from "./autoproto";

function testWithSlab(s: string, expectation: any) {
	const r = mapSome((v) => slab.decode(v, v.byteLength), decompress(s));
	expect(r).toEqual(expectation);
	const rencoded = withDefault("", mapSome(r => compress(slab.encode(r, (n) => new DataView(new Uint8Array(n).buffer))), r));
	expect(decompress(s)).toEqual(decompress(rencoded))
	const rr = mapSome((v) => slab.decode(v, v.byteLength), decompress(rencoded));
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
									"id": "538f748b-19ba-496e-87df-10618a931874",
									"positions": [
										{
											"rot": 255,
											"x": 3.99,
											"z": 2.77,
											"y": 0
										}
									]
								},
								{
									"id": "e2ef21b8-6142-4135-9859-9281a8b256fc",
									"positions": [
										{
											"rot": 135,
											"x": 0,
											"z": 0.85,
											"y": 0
										},
										{
											"rot": 135,
											"x": 7.95,
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
