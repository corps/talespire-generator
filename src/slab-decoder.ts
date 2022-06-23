import {gzip, ungzip} from "pako";
import {isSome, mapSome, Maybe, maybeOfNullable} from "./maybe";
import {byte, DataAccessor, float32, int16, pack, uint16, uint32, unpack} from "./autoproto";

const {tuple, lift, array, obj} = DataAccessor;
const MAGIC = 3520002766;

export function parseSlab(slabStr: string) {
	const d = decompress(slabStr);
	if (isSome(d)) {
		return slab.decode(d[0], d[0].byteLength);
	}
	throw new Error("Invalid slab string, could not decompress text.")
}

export function decompress(slabStr: string): Maybe<DataView> {
	slabStr = slabStr.replace(/[` ]/g, "")
	return mapSome<Uint8Array, DataView>(
		v => new DataView(v.buffer)
	)(maybeOfNullable(ungzip(new Uint8Array(atob(slabStr).split('').map(x => x.charCodeAt(0))))))
}

export function compress(v: DataView): string {
	return btoa(String.fromCharCode(...gzip(new Uint8Array(v.buffer, v.byteOffset, v.byteLength))));
}

function withPadding<T, View>(accessor: DataAccessor<T, View>, padding: DataAccessor<any, View>): DataAccessor<T, View> {
	return tuple(accessor, padding).map(([a, b]) => a, (a) => [a, padding.d]);
}

export const hexDigit = byte.map((byte) => ('0' + byte.toString(16)).slice(-2), v => parseInt(v, 16) || 0);
export const header = obj({
	magic: uint32.withDefault(MAGIC), version: uint16.withDefault(2),
});

// NOTE -- the first 32bit word, and the 2nd and the 3rd 16bit words, are little endian encoded, thus
// we need to process them in reverse.  The last 8 bytes are arbitrary and do not respect endianness.
export const uuid = tuple(tuple(hexDigit, hexDigit, hexDigit, hexDigit),
	tuple(hexDigit, hexDigit),
	tuple(hexDigit, hexDigit),
	tuple(hexDigit, hexDigit),
	tuple(hexDigit, hexDigit, hexDigit, hexDigit, hexDigit, hexDigit),
).map(
	parts => [
		parts[0].reverse().join(''),
		parts[1].reverse().join(''),
		parts[2].reverse().join(''),
		parts[3].join(''),
		parts[4].join('')
	].join('-'),
	s => [
		[s.slice(6, 8), s.slice(4, 6), s.slice(2, 4), s.slice(0, 2)],
		[s.slice(11, 13), s.slice(9, 11)],
		[s.slice(16, 18), s.slice(14, 16)],
		[s.slice(19, 21), s.slice(21, 23)],
		[s.slice(24, 26), s.slice(26, 28), s.slice(28, 30), s.slice(30, 32), s.slice(32, 34), s.slice(34, 36)]
	])

export const v2AssetHeader = obj({
	id: uuid,
	count: withPadding(uint16, uint16),
}).repeat(withPadding(uint16, uint16));

const v2PosComponent = withPadding(unpack(16), unpack(2)).map(v => v / 100, v => Math.round(v * 100));
const v2Rot = withPadding(unpack(5), unpack(3)).map(n => n * 15, deg => Math.floor(deg / 15));

function v2AssetPositions(id: string, count: number) {
	return obj({
		id: lift(id),
		positions: pack(8, withPadding(obj({
			x: v2PosComponent,
			y: v2PosComponent,
			z: v2PosComponent,
			rot: v2Rot,
		}), unpack(2))).repeat(lift(count))
	});
}

export function v2AssetBody(assets: typeof v2AssetHeader.d) {
	return array(assets.map(({count, id}) => v2AssetPositions(id, count)));
}

export const v2Assets = withPadding(v2AssetHeader.then(
	(assets) => v2AssetBody(assets),
	(assets) => assets.map(({id, positions}) => ({id, count: positions.length}))
), uint16);

export const slab = header.then(({magic, version}) => {
	if (magic != MAGIC) {
		throw new Error(`Invalid slab, magic header value was ${magic}, expected ${MAGIC}`);
	}

	switch (version) {
		case 2:
			return obj({
				version: lift(version),
				assets: v2Assets,
			});
		default:
			throw new Error(`Invalid slab, unknown version ${version}`)
	}
}, ({version}) => ({version, magic: MAGIC}))
