import React, {useMemo} from 'react';
import {AutoMultilineString, AutoString, bbuild, build, noop, useTap} from "./autoform";
import {deflate, ungzip} from "pako";

function App() {
	const [SlabInput, value] = useTap(useMemo(() => build(AutoMultilineString).bind("").map(decodeSlab).Input, []));

	return (<div className="mw7 center pa4">
			<SlabInput onChange={noop}/>
			<textarea value={value}
								readOnly
								className="input-reset ba b--black-20 pa2 mb2 db w-100"
			/>
		</div>);
}

function decodeSlab(slabStr: string): string {
	console.log("decoding")
	try {
		const bin = ungzip(new Uint8Array(atob(slabStr).split('').map(x => x.charCodeAt(0))));
		if (!bin) return "";
		const reader = new BinReader(bin);
		console.log({reader})
		const header = parseHeader(reader);
		const layouts = parseLayouts(reader);
		const positions = parsePositions(reader, layouts);
		// return JSON.stringify(parseLayouts(reader));
		return "";
	} catch (e) {
		console.error(e);
		return "";
	}
}

function parseHeader(reader: BinReader) {
	const header1 = reader.consumeUInt32();
	const header2 = reader.consumeUInt16();
	return {header1, header2};
}

function parsePositions(reader: BinReader, layouts: ReturnType<typeof parseLayouts>) {
	const positions = [];
	layouts.forEach(layout => {
		const layoutPosition = [];
		positions.push(layoutPosition);
		for (let i = 0; i < layout.assetCount; ++i) {

		}
	})
}

function parseLayouts(reader: BinReader) {
	const num = reader.consumeUInt32();
	const layouts = [];

	for (let i = 0; i < num; ++i) {
		const uuid = [
			[reader.consumeInt8(), reader.consumeInt8(), reader.consumeInt8(), reader.consumeInt8(),],
			[reader.consumeInt8(), reader.consumeInt8(),],
			[reader.consumeInt8(), reader.consumeInt8(),],
			[reader.consumeInt8(), reader.consumeInt8(),],
			[
				reader.consumeInt8(),
				reader.consumeInt8(),
				reader.consumeInt8(),
				reader.consumeInt8(),
				reader.consumeInt8(),
				reader.consumeInt8(),
			]
		].map(toHexChunk).join('-');
		const assetCount = reader.consumeUInt32();
		layouts.push({uuid, assetCount});

		// unknown struct end section
		// reader.consumeInt16();
	}

	return layouts;
}

function toHexChunk(byteArray: number[]) {
	return byteArray.map(byte => ('0' + (byte + 0xFF).toString(16)).slice(-2)).join('');
}

class BinReader {
	constructor(private src: Uint8Array, private idx = 0, private dv = new DataView(src.buffer)) {
	}

	private read(size: number) {
		if (this.idx + size >= this.src.length) throw new Error('Unexpected EOF!');
		const {idx} = this;
		this.idx += size;
		return idx;
	}

	consumeInt32() {
		return this.dv.getInt32(this.read(4), true);
	}

	consumeInt16() {
		return this.dv.getInt16(this.read(2), true);
	}

	consumeInt8() {
		return this.dv.getInt8(this.read(1));
	}

	consumeUInt8() {
		return this.dv.getUint8(this.read(1));
	}

	consumeUInt16() {
		return this.dv.getUint16(this.read(2), true);
	}

	consumeUInt32() {
		return this.dv.getUint32(this.read(4), true);
	}

	consumeFloat32() {
		return this.dv.getFloat32(this.read(4), true);
	}
}

export default App;

