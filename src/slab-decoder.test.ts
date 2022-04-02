import {compress, decompress, header, hexDigit, hexId, asset, assets, slab} from "./slab-decoder";
import {mapSome} from "./maybe";
import {DataViewAccessor} from "./autoproto";

function testWithSlab(s: string, expectation: any) {
	const r = mapSome(decompress(s), (v) => slab.decode(v, true));
	expect(r).toEqual(expectation);
	expect(mapSome(r, r => compress(new Uint8Array(slab.encode(r).buffer)))).toEqual([s]);
}

function testEncodeDecode<T>(accessor: DataViewAccessor<T>, t: T) {
	expect(accessor.decode(accessor.encode(t))).toEqual(t);
}

// describe('slab-decoder', () => {
// 	describe('hexDigit', () => {
// 		it('works', () => {
// 			testEncodeDecode(hexDigit, '8f');
// 		})
// 	})
//
// 	describe('hexId', () => {
// 		it('works', () => {
// 			testEncodeDecode(hexId, '690f7d73-7d85-1f48-949a-e8b4930b11ac');
// 		})
// 	})
//
// 	describe('header', () => {
// 		it('works', () => {
// 			testEncodeDecode(header, {version: 1, magic: 20});
// 		})
// 	})
//
// 	describe('asset', () => {
// 		it('works', () => {
// 			testEncodeDecode(asset, {id: '690f7d73-7d85-1f48-949a-e8b4930b11ac', count: 20});
// 		})
// 	})
//
// 	describe('assets', () => {
// 		it('works', () => {
// 			testEncodeDecode(
// 				assets,
// 				{assets: [{id: '690f7d73-7d85-1f48-949a-e8b4930b11ac', count: 20}, asset.d], padding: 0}
// 			);
// 		})
// 	})
//
// 	describe('asset', () => {
// 		it('works', () => {
// 			testEncodeDecode(asset, {id: '690f7d73-7d85-1f48-949a-e8b4930b11ac', count: 20});
// 		})
// 	})
//
// 	describe('slab', () => {
// 		it('works', () => {
// 			testWithSlab("H4sIAAAAAAAACzv369xFJgZGBgaGTP7a4tpWeY8ps15smcwtuAYkhgAA/snG1ygAAAA=", [
// 				{
// 					header: {
// 						magic: 3520002766, version: 2,
// 					}, assetsAndLayout: {
// 						layouts: [
// 							{
// 								id: "690f7d73-7d85-1f48-949a-e8b4930b11ac", positions: [
// 									{
// 										rot: 0, x: 0, y: 0, z: 0,
// 									}
// 								]
// 							}
// 						], padding: 0
// 					},
// 				}
// 			]);
// 		})
// 	});
// })

