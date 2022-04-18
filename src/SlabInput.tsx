import React from 'react';
import {compress, decompress, slab, uuid} from "./slab-decoder";
import {mapSome, Maybe, withDefault} from "./maybe";
import {bindRight, catchErr, compose, Either, left, mapLeft, mapRight, right} from "./either";
import {Asset, AssetLibrary} from "./AssetLibraryInput";
import {V3} from "./vector";
import {AutoInput, bindParams} from "./autoinputs";
import {TextInput} from "./inputs";

export const SlabInput =
	AutoInput.renderWithErr(
		AutoInput.ident("").map(decompress).map(mapSome(right)).map(withDefault(left("Invalid gzip, probably incomplete slab")))
		.map(bindRight(catchErr(bytes => slab.decode(bytes, bytes.byteLength))))
		.map(bindRight(catchErr(v2slab => {
			return (library: AssetLibrary) => {
				const integratedSlab = new Slab("<pasted>", library);
				v2slab.assets.map(({id, positions}) => {
					positions.forEach(pos => {
						integratedSlab.addFromLibrary(id, V3.fromObj(pos), pos.rot);
					});
				})

				return integratedSlab;
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

	constructor(name: string, public library: Record<string, Asset>, assets: Asset[] = [], id: string = uuidv4()) {
		super(new V3(0, 0, 0), new V3(0, 0, 0), 0, name, id, false)
		assets.forEach(asset => this.add(asset));
	}

	copy(assets = this.assets) {
		return new Slab(
			this.name,
			this.library,
			assets,
			this.id,
		)
	}

	addFromLibrary(id: string, position: V3, rot: number) {
		if (id in this.library) {
			const item = this.library[id];
			this.add(item.repositioned(position.shift(item.center), rot));
		} else {
			this.unknownIds.add(id);
		}
	}

	add(asset: Asset) {
		this.assets.push(asset);
		this.seenIds.add(asset.id);
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
