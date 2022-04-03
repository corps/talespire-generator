import {gzip, ungzip} from "pako";
import {mapSome, Maybe, maybeOfNullable} from "./maybe";
import {byte, DataAccessor, float32, int16, uint16, uint32} from "./autoproto";

const {tuple, lift, array, obj} = DataAccessor;
const MAGIC = 3520002766;

export function decompress(slabStr: string): Maybe<DataView> {
	slabStr = slabStr.replace(/[` ]/g, "")
	return mapSome(
		maybeOfNullable(ungzip(new Uint8Array(atob(slabStr).split('').map(x => x.charCodeAt(0))))),
		v => new DataView(v.buffer)
	)
}

export function compress(v: DataView): string {
	return btoa(String.fromCharCode(...gzip(new Uint8Array(v.buffer, v.byteOffset, v.byteLength))));
}

function withPadding<T, View>(accessor: DataAccessor<T, View>, padding: DataAccessor<any, View>): DataAccessor<T, View> {
	return tuple(accessor, lift(padding.d)).map(([a, b]) => a, (a) => [a, padding.d]);
}

export const hexDigit = byte.map((byte) => ('0' + byte.toString(16)).slice(-2), v => parseInt(v, 16) || 0);
export const header = obj({
	magic: uint32.withDefault(MAGIC), version: uint16.withDefault(2),
});

export const uuid = tuple(tuple(hexDigit, hexDigit, hexDigit, hexDigit),
	tuple(hexDigit, hexDigit),
	tuple(hexDigit, hexDigit),
	tuple(hexDigit, hexDigit, hexDigit, hexDigit, hexDigit, hexDigit, hexDigit, hexDigit),
).map(parts => parts.map(s => s.join('')).join('-'), s => [
	[s.slice(0, 2), s.slice(2, 4), s.slice(4, 6), s.slice(6, 8)],
	[s.slice(9, 11), s.slice(11, 13)],
	[s.slice(14, 16), s.slice(16, 18)],
	[s.slice(19, 21), s.slice(21, 23), s.slice(23, 25), s.slice(25, 27), s.slice(27, 29), s.slice(29, 31), s.slice(31, 33), s.slice(33, 35)]
])

export const v1AssetHeader = withPadding(obj({
	id: uuid, count: uint16
})).repeat(uint16)

export const v2AssetHeader = withPadding(obj({
	id: uuid, count: uint16,
})).repeat(uint16);

const BITS_PER_COMPONENT = 18;
const BITS_FOR_ROTATION = 5;
const ROT_MASK = (1 << BITS_FOR_ROTATION) - 1;
const ENCODED_POSITION_MAX_VALUE = (1 << BITS_PER_COMPONENT) - 1;
const Y_BITS_OFFSET = BITS_PER_COMPONENT;
const Z_BITS_OFFSET = Y_BITS_OFFSET + BITS_PER_COMPONENT;
const ROTATION_BITS_OFFSET = Z_BITS_OFFSET + BITS_PER_COMPONENT;
const EXTRA_BITS_OFFSET = ROTATION_BITS_OFFSET + BITS_FOR_ROTATION;
const DEGREES_PER_ROT_STEP = 360 / 24;
//
// const v2Positions = tuple(byte, byte, byte, byte, byte, byte, byte, byte).map(
// 	([h, g, f, e, d, c, b, a]) => {
// 		const x = a << 18 + b << 10 + (c & ((1 << 2) - 1));
// 	},
// 	() => [0, 0, 0, 0]
// )

function v2AssetPositions(id: string, count: number) {
	return obj({
		id: lift(id),
		positions: obj({
			x: uint16,
			z: uint16,
			y: uint16,
			rot: int16,
		}).repeat(lift(count))
	})
}

export const v1Shape = obj({
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
})

function v1AssetPositions(id: string, count: number) {
	return obj({
		id: lift(id),
		positions: withPadding(v1Shape, 3).repeat(lift(count))
	});
}

export function v2AssetBody(assets: typeof v2AssetHeader.d) {
	return withPadding(array(assets.map(({count, id}) => v2AssetPositions(id, count))));
}

function v1AssetBody(assets: typeof v1AssetHeader.d) {
	return array(assets.map(({count, id}) => v1AssetPositions(id, count)));
}

export const v1Assets = v1AssetHeader.then(
	(assets) => v1AssetBody(assets),
	(assets) => assets.map(({id, positions}) => ({id, count: positions.length}))
)

export const v2Assets = v2AssetHeader.then(
	(assets) => v2AssetBody(assets),
	(assets) => assets.map(({id, positions}) => ({id, count: positions.length}))
)

export const v1AssetBounds = withPadding(v1Shape, 3, 255);

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

export type Slab = typeof slab.d;
