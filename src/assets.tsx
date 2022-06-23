import {V3} from "./vector";
import {placeable, readAssetDb} from "./asset-decoder";
import {JsonDataAcccesor} from "./autoproto";

export type AssetLibrary = { [k: string]: Asset };

const {fillOut} = JsonDataAcccesor;

export function parseLibrary(obj: any) {
	const parsedLibrary = readAssetDb(obj);

	const library = fillOut(parsedLibrary, "(top level object)");
	const result: AssetLibrary = {};

	fillOut(library.Tiles, "(.Tiles)").forEach(parsedTile => {
		const asset = Asset.fromPlaceable(parsedTile, false);
		result[asset.id] = asset;
	})

	fillOut(library.Props, "(.Props)").forEach(parsedTile => {
		const asset = Asset.fromPlaceable(parsedTile, true);
		result[asset.id] = asset;
	})

	return result;
}

export class Asset {
	constructor(public center: V3, public extents: V3, public rot: number, public name: string, public id: string, public isProp: boolean) {}

	static libraryFromObj(obj: any) {

	}

	static fromPlaceable(p: typeof placeable.d, isMini: boolean): Asset {
		const obj = fillOut(p, "(.Props[x])");
		const bounds = fillOut(obj.ColliderBoundsBound, "(.Props[x].ColliderBoundsBound)");
		const extent = fillOut(bounds.m_Extent, "(.Props[x].ColliderBoundsBound.m_Extent)");
		const center = fillOut(bounds.m_Center, "(.Props[x].ColliderBoundsBound.m_Center)");
		return new Asset(
			new V3(fillOut(center.x, "(.Props[x].ColliderBoundsBound.m_Center.x)"), fillOut(center.y, "(.Props[x].ColliderBoundsBound.m_Center.y)"), fillOut(center.z, "(.Props[x].ColliderBoundsBound.m_Center.z)")),
			new V3(fillOut(extent.x), fillOut(extent.y), fillOut(extent.z)),
			0,
			fillOut(obj.Name),
			fillOut(obj.Id),
			isMini
		)
	}

	expand(): Asset[] {
		return [this];
	}

	get topRight() {
		return this.center.shift(this.extents);
	}

	get bottomLeft() {
		return this.center.shift(this.extents.scale(-1));
	}

	repositioned(newCenter: V3, rot: number) {
		return new Asset(newCenter, this.extents, this.rot + rot, this.name, this.id, this.isProp);
	}

	stretchTo(other: Asset) {
		const newTopRight = V3.max(this.topRight, other.topRight);
		const newBottomLeft = V3.min(this.bottomLeft, this.bottomLeft);
		this.center = new V3(
			(newTopRight.x - newBottomLeft.x) / 2,
			(newTopRight.y - newBottomLeft.y) / 2,
			(newTopRight.z - newBottomLeft.z) / 2
		);
		this.extents = newTopRight.shift(newBottomLeft.scale(-1)).scale(0.5);
	}
}
