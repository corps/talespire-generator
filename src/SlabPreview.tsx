import React, {PropsWithChildren, useCallback, useMemo, useRef, useState} from 'react';
import {Canvas, extend, ReactThreeFiber, useThree} from "@react-three/fiber";
import Color from 'color';
import { V3 } from './vector';
import {Slab} from "./slabFromText";
import {TextField} from "@mui/material";
import {TabSet} from "./TabSet";
import {compress, slab as slabAccessor} from './slab-decoder'
import {TextInput} from "./inputs";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

extend({ OrbitControls });

interface Props {
	slab: Slab,
}

export function SlabPreview({slab}: Props) {
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

	const {assets} = slab;
	console.log({assets})

	const preview = <Canvas
		style={{width: 640, height: 480}}
		// camera={{ position: [-2, 3, -1], near: 0.1, far: 15 }}
	>
		<ambientLight intensity={0.7} />
		<spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
		<pointLight position={[-10, -10, -10]} />
		{slab.assets.map((asset, i) =>
			<AssetBlock key={i + ""} rot={asset.rot} center={asset.center} extent={asset.extents} color={assetColorings[asset.id].hex()}/>
		)}
		<Controls/>
	</Canvas>

	const serialized = useMemo(() => {
		return compress(slabAccessor.encode(slab.toV2Slab(assets), (size) => new DataView(new Uint8Array(size).buffer)));
	}, [assets, slab])

	const source = <TextInput readonly value={serialized}/>;
	return <TabSet options={{preview, source}}/>
}

function Controls() {
	const {
		camera,
		gl: { domElement },
	} = useThree()

	return <orbitControls args={[camera, domElement]} />;
}

interface BoxProps {
	center: V3,
	extent: V3,
	rot: number,
	color: string,
	onHover?: (hovered: boolean) => void,
	onClick?: () => void,
	active?: boolean,
}

function AssetBlock({center, extent, rot, color, onClick, onHover, active}: BoxProps) {
	const mesh = useRef()
	const activeColor = useMemo(() => new Color(color).lighten(0.6).hex(), [color]);
	const extentT = useMemo(() => extent.asTuple(), [extent]);
	const centerT = useMemo(() => center.asTuple(), [center]);
	const hoverIn = useCallback(() => onHover && onHover(true), [onHover]);
	const hoverOut = useCallback(() => onHover && onHover(false), [onHover]);

	return (
		<mesh
			ref={mesh}
			position={centerT}
			rotation={[0, rot * -Math.PI / 180, 0]}
			onClick={onClick}
			onPointerOver={hoverIn}
			onPointerOut={hoverOut}>
			<boxBufferGeometry args={extentT} />
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
