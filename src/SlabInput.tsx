import React from 'react';
import {decompress, slab, uuid} from "./slab-decoder";
import {mapSome, Maybe, withDefault} from "./maybe";
import {bindRight, catchErr, compose, Either, left, mapLeft, mapRight, right} from "./either";
import {Asset, AssetLibrary} from "./AssetLibraryInput";
import {V3} from "./vector";
import {AutoInput, bindParams} from "./autoinputs";
import {TextInput} from "./inputs";

export const SlabInput =
	AutoInput.renderWithErr(
		AutoInput.lift("", "").map(decompress).map(mapSome(right)).map(withDefault(left("Invalid gzip, probably incomplete slab")))
		.map(bindRight(catchErr(bytes => slab.decode(bytes, bytes.byteLength))))
		.map(mapLeft(err => "Invalid slab, possible version mismatch."))
		.map(bindRight(catchErr(v2slab => {
			return (library: AssetLibrary) => {
				const slab = new Slab("<pasted>");
				v2slab.assets.map(({id, positions}) => {
					positions.forEach(pos => {
						slab.addFromLibrary(id, V3.fromObj(pos), pos.rot, library);
					});
				})

				return slab;
			}
		}))), bindParams(TextInput, {label: "Slab"}))

function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

export class Slab extends Asset {
	public assets: Asset[] = [];
	public seenIds: Set<string> = new Set<string>();
	public unknownIds: Set<string> = new Set<string>();

	constructor(name: string, id: string = uuidv4()) {
		super(new V3(0, 0, 0), new V3(0, 0, 0), 0, name, id, false)
	}

	addFromLibrary(id: string, position: V3, rot: number, library: AssetLibrary) {
		if (id in library) {
			this.add(library[id].repositioned(position, rot));
		} else {
			if (!this.unknownIds.has(id)) {
				this.unknownIds = new Set<string>([...this.unknownIds, id])
			}
		}
	}

	add(asset: Asset) {
		this.assets = [...this.assets, asset]
		if (!this.seenIds.has(asset.id)) {
			this.seenIds = new Set<string>([...this.seenIds, asset.id])
		}
		this.stretchTo(asset);
	}

	expand(assets = this.assets): Asset[] {
		return assets.reduce((acc, n) => [...acc, ...n.expand()], [] as Asset[]);
	}

	toV2Slab(assets = this.assets): typeof slab.d {
		const assetsById: Record<string, Asset[]> = {};
		this.expand(assets).forEach(asset => {
			if (!(asset.id in assetsById)) {
				assetsById[asset.id] = [];
			}
			(assetsById[asset.id] = assetsById[asset.id] || []).push(asset);
		})

		return {
			version: 2,
			assets: Object.entries(assetsById).map(([id, assets]) => ({
				id,
				positions: assets.map(({center: {x, y, z}, rot}) => ({x, y, z, rot})),
			}))
		}
	}
}
