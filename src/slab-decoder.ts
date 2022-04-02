import {ungzip} from "pako";
import {mapSome, Maybe, maybeOfNullable} from "./maybe";
import {DataViewAccessor} from "./autoproto";

const {read, lift, tuple} = DataViewAccessor;

export function decompress(slabStr: string): Maybe<DataView> {
	return mapSome(maybeOfNullable(ungzip(new Uint8Array(atob(slabStr).split('').map(x => x.charCodeAt(0))))), v => new DataView(v.buffer))
}

const hexDigit = read(false, 1)
	.map((byte) => ('0' + byte.toString(16)).slice(-2), v => parseInt(v, 255));
const header = tuple(read(false, 4), read(false, 2)).map(
	([magic, version]) => ({magic, version}),
	({magic, version}) => [magic, version]
);
const hexId = tuple(
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
const layout = tuple(hexId, read(false, 4), read(false, 2)).map(([id, count]) => ({id, count}), ({id, count}) => [id, count, 0]);
const layouts = layout.repeat(read(false, 4));

export const slab = tuple(header, layouts).map(([header, layouts]) => ({header, layouts}), ({header, layouts}) => [header, layouts]);


// function parsePositions(reader: BinReader, layouts: ReturnType<typeof parseLayouts>) {
// 	const positions = [];
// 	layouts.forEach(layout => {
// 		const layoutPosition = [];
// 		positions.push(layoutPosition);
// 		for (let i = 0; i < layout.assetCount; ++i) {
//
// 		}
// 	})
// }

// function parseLayouts(reader: BinReader) {
// 	const num = reader.consumeUInt32();
// 	const layouts = [];
//
// 	for (let i = 0; i < num; ++i) {
// 		const uuid = [
// 			[reader.consumeInt8(), reader.consumeInt8(), reader.consumeInt8(), reader.consumeInt8(),],
// 			[reader.consumeInt8(), reader.consumeInt8(),],
// 			[reader.consumeInt8(), reader.consumeInt8(),],
// 			[reader.consumeInt8(), reader.consumeInt8(),],
// 			[
// 				reader.consumeInt8(),
// 				reader.consumeInt8(),
// 				reader.consumeInt8(),
// 				reader.consumeInt8(),
// 				reader.consumeInt8(),
// 				reader.consumeInt8(),
// 			]
// 		].map(toHexChunk).join('-');
// 		const assetCount = reader.consumeUInt32();
// 		layouts.push({uuid, assetCount});
//
// 		// unknown struct end section
// 		// reader.consumeInt16();
// 	}
//
// 	return layouts;
// }
//
// function toHexChunk(byteArray: number[]) {
// 	return byteArray.map(byte => ('0' + (byte + 0xFF).toString(16)).slice(-2)).join('');
// }
//
