import {gzip, ungzip} from "pako";
import {mapSome, Maybe, maybeOfNullable} from "./maybe";
import {byte, DataViewAccessor, float32, int16, uint16, uint32} from "./autoproto";
const {tuple, lift, array, obj} = DataViewAccessor;

export function decompress(slabStr: string): Maybe<DataView> {
	return mapSome(maybeOfNullable(ungzip(new Uint8Array(atob(slabStr).split('').map(x => x.charCodeAt(0))))), v => new DataView(v.buffer))
}

export function compress(array: Uint8Array): string {
	return btoa(String.fromCharCode(...gzip(array)));
}

export const hexDigit = byte.map((byte) => ('0' + byte.toString(16)).slice(-2), v => parseInt(v, 16));
export const header = obj({
	magic: uint32,
	version: uint16,
});

function joinedString(a: DataViewAccessor<string>, stringLength: number, count: number, joinBy: string): DataViewAccessor<string> {
	return a.repeat(lift(count)).map(s => s.join(joinBy), s => {
		const result: string[] = [];
		const parts = s.split(joinBy);
		while (parts.length) {
			result.push(parts.slice(0, stringLength));
			s = s.slice(stringLength);
		}
		return result;
	})
}

export const hexId = tuple(
	tuple(hexDigit, hexDigit, hexDigit, hexDigit),
	tuple(hexDigit, hexDigit),
	tuple(hexDigit, hexDigit),
	tuple(hexDigit, hexDigit),
	tuple(hexDigit, hexDigit, hexDigit, hexDigit, hexDigit, hexDigit),
).map(
	parts => parts.map(s => s.join('')).join('-'),
	s => [
			[s.slice(0, 2), s.slice(2, 4), s.slice(4, 6), s.slice(6, 8)],
			[s.slice(9, 11), s.slice(11, 13)],
			[s.slice(14, 16), s.slice(16, 18)],
			[s.slice(19, 21), s.slice(21, 23)],
			[s.slice(24, 26), s.slice(26, 28), s.slice(28, 30), s.slice(30, 32), s.slice(32, 34), s.slice(34, 36)]
	]
)
export const v2Asset = obj({
	id: tuple(hexId, tuple(hexDigit, hexDigit).map()).map(parts => parts.),
	count: uint16,
})

export const assets = asset.repeat(uint16);

export const layout = obj({
	center: obj({
		x: float32,
		y: float32,
		z: float32,
	}),
	extents: obj({
		x: float32,
		y: float32,
		z: float32,
	}),
	rot: byte,
});

export const assetsAndLayout = assets.then((assets) => array(assets.map(({count, id, padding}) => obj({
		id: lift(id),
		positions: layout.repeat(lift(count)),
		padding: lift(padding),
	})))
, (layouts) => (
	layouts.map(({id, positions, padding}) => ({
			id,
			count: positions.length,
			padding,
		}))));

export const v2Slab = repeat()

const MAGIC = 1;
export const slab = header.then(({magic, version}) => {
	if (magic != MAGIC) {
		throw new Error(`Invalid slab, magic header value was ${magic}, expected ${MAGIC}`);
	}

	switch (version) {
		case 1:
			return obj({
				magic: lift(magic),
				version: lift(version),
				slab: v2Slab
			});
		default:
			throw new Error(`Invalid slab, unknown version ${version}`)
	}
}, ({version, magic}) => ({version, magic}))

export type Slab = typeof slab.d;
