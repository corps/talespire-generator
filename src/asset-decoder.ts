import {JsonDataAcccesor, jsonString, jsonNumber, jsonBoolean, jsonAny} from "./autoproto";
import {mapRight} from "./either";
const {jsonObj, jsonArray, fillOut, unwrap} = JsonDataAcccesor;

export const v3 = jsonObj({
	x: jsonNumber,
	y: jsonNumber,
	z: jsonNumber,
});

export const v4 = jsonObj({
	x: jsonNumber,
	y: jsonNumber,
	z: jsonNumber,
	w: jsonNumber,
});

export const loaderData = jsonObj({
	BundleId: jsonString,
	AssetName: jsonString,
})


export const assetLoaderData = jsonObj({
	LoaderData: loaderData,
	Position: v3,
	Rotation: v4,
	Scale: v3,
})

const asset = {
	Id: jsonString,
	Name: jsonString,
	GroupTag: jsonString,
	Tags: jsonArray(jsonString),
	IsDeprecated: jsonBoolean,
}

export const colliderBounds = jsonObj({
	m_Center: v3,
	m_Extent: v3,
})

export const placeable = jsonObj({
	...asset,
	Assets: jsonArray(assetLoaderData),
	ColliderBoundsBound: colliderBounds,
	IsInteractable: jsonBoolean,
})

export const assetDb = jsonObj({
	Props: jsonArray(placeable),
	Tiles: jsonArray(placeable),
})

export function readAssetDb(value: any): typeof assetDb.d {
	const spine = jsonAny.encode(value, size => new Array(size));
	return assetDb.decode(spine, spine.length);
}

export function writeAssetDb(value: typeof assetDb.d) {
	const spine = assetDb.encode(value, size => new Array(size));
	return jsonAny.decode(spine);
}
