import React, {Dispatch, useCallback, useMemo, useRef, useState} from 'react';
import {Canvas, extend, ReactThreeFiber, useThree} from "@react-three/fiber";
import Color from 'color';
import { V3 } from './vector';
import {Slab} from "./SlabInput";
import {TabSet} from "./TabSet";
import {compress, slab as slabAccessor} from './slab-decoder'
import {TextInput} from "./inputs";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {Asset} from "./AssetLibraryInput";
import {mapSome, Maybe, some, withDefault} from "./maybe";

extend({ OrbitControls });

interface Props {
	slab: Slab,
}

function SlabCanvas({slab, hoveredAsset, setHoveredAsset}: Props & {hoveredAsset: Maybe<Asset>, setHoveredAsset: Dispatch<Maybe<Asset>>}) {
	const assetColorings = useMemo(() => {
		const result: Record<string, Color> = {};
		let head: Color = Color.rgb(140, 10, 15);
		const un = new Array(...slab.unknownIds).sort();
		const sn = new Array(...slab.seenIds).sort();
		const totalIds = slab.unknownIds.size + slab.seenIds.size;

		sn.forEach(id => {
			result[id] = head.darken(0.3);
			head = head.rotate(360 / totalIds)
		})

		un.forEach(id => {
			result[id] = head.lighten(0.3);
			head = head.rotate(360 / totalIds)
		})

		return result;
	}, [slab.seenIds, slab.unknownIds])

	const onHover = useCallback((hover: boolean, asset: Asset) => {
		if (hover)
			setHoveredAsset(some(asset));
		else if (withDefault(false, mapSome(a => a === asset, hoveredAsset)))
			setHoveredAsset(null);
	}, [hoveredAsset, setHoveredAsset])


	return <Canvas
		style={{width: 640, height: 480}}
		// camera={{ position: [-2, 3, -1], near: 0.1, far: 15 }}
	>
		<ambientLight intensity={0.7} />
		<spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
		<pointLight position={[-10, -10, -10]} />
		{slab.assets.map((asset, i) =>
			<AssetBlock key={i + ""} asset={asset} color={assetColorings[asset.id].hex()} onHover={onHover} scale={
				withDefault(false, mapSome(a => a === asset, hoveredAsset)) ? 1.25 : 1
			}/>
		)}
		<Controls/>
	</Canvas>
}

export function SlabPreview({slab}: Props) {
	const {assets} = slab;
	const [hoveredAsset, setHoveredAsset] = useState(null as Maybe<Asset>)

	const stats = <>
		Extents: {slab.extents.toString()}, Objects: {slab.expand().length}
	</>

	const preview = <div>
		<div><SlabCanvas slab={slab} hoveredAsset={hoveredAsset} setHoveredAsset={setHoveredAsset}/></div>
		<div>
			{withDefault("", mapSome(asset => `Name: ${asset.name}, Pos: ${asset.center}, Extent: ${asset.extents}, Rotation: ${asset.rot}`, hoveredAsset))}
		</div>
	</div>

	const serialized = useMemo(() => {
		return compress(slabAccessor.encode(slab.toV2Slab(assets), (size) => new DataView(new Uint8Array(size).buffer)));
	}, [assets, slab])

	const source = <TextInput readonly value={serialized}/>;
	return <TabSet options={{stats, preview, source}}/>
}

function Controls() {
	const {
		camera,
		gl: { domElement },
	} = useThree()

	return <orbitControls args={[camera, domElement]} />;
}

interface BoxProps {
	asset: Asset,
	color: string,
	onHover?: (hovered: boolean, asset: Asset) => void,
	onClick?: () => void,
	active?: boolean,
	scale?: number
}

function AssetBlock({asset, color, onClick, onHover, active, scale=1}: BoxProps) {
	const {rot, extents, center} = asset;
	const mesh = useRef()
	const activeColor = useMemo(() => new Color(color).lighten(0.6).hex(), [color]);
	const extentsT = useMemo(() => extents.scale(scale).scale(2).asTuple(), [extents, scale]);
	const centerT = useMemo(() => center.asTuple(), [center]);
	const hoverIn = useCallback(() => onHover && onHover(true, asset), [asset, onHover]);
	const hoverOut = useCallback(() => onHover && onHover(false, asset), [asset, onHover]);

	return (
		<mesh
			ref={mesh}
			position={centerT}
			rotation={[0, rot * Math.PI / 180, 0]}
			onClick={onClick}
			onPointerOver={hoverIn}
			onPointerOut={hoverOut}>
			<boxBufferGeometry args={extentsT} />
			<meshStandardMaterial color={active ? activeColor : color} />
		</mesh>
	)
}

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'orbitControls': ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>;
		}
	}
}
