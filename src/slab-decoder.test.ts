import {decompress, slab} from "./slab-decoder";
import {mapSome} from "./maybe";

describe('slab', () => {
	it('works', () => {
		expect(mapSome(decompress(
			"H4sIAAAAAAAACzv369xFJgZGBgaGTP7a4tpWeY8ps15smcwtuAYkhgAA/snG1ygAAAA="
		), (v) => slab.decode(v))).toEqual([
			{
				header: {
					magic: 3520002766,
					version: 2,
				},
				layouts: [
					{
						count: 1,
						id: "690f7d73-7d85-1f48-949a-e8b4930b11ac"
					}
				]
			}
		]);
	})
});
