import React, {PropsWithChildren, useCallback, useMemo, useRef, useState} from 'react';
import {Canvas} from "@react-three/fiber";
import Color from 'color';
import { V3 } from './vector';
import {Slab} from "./slabFromText";
import {Grid, Tab, Tabs, TextField} from "@mui/material";
import {TabSet} from "./TabSet";
import {compress, slab as slabAccessor} from './slab-decoder'

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

	const preview = <Canvas>
		{/*<ambientLight intensity={0.5} />*/}
		{/*<spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />*/}
		{/*{slab.assets.map((asset, i) =>*/}
		{/*	<AssetBlock key={i + ""} center={asset.center} extent={asset.extents} color={assetColorings[asset.id].hex()}/>*/}
		{/*)}*/}
	</Canvas>
	return preview;

	// const serialized = useMemo(() => {
	// 	return compress(slabAccessor.encode(slab.toV2Slab(assets), (size) => new DataView(new Uint8Array(size).buffer)));
	// }, [assets, slab])

	// const source = <TextField aria-readonly disabled value={serialized}/>;
	// return <TabSet options={{preview, source}}/>
}

interface BoxProps {
	center: V3,
	extent: V3,
	color: string,
	onHover?: (hovered: boolean) => void,
	onClick?: () => void,
	active?: boolean,
}

function AssetBlock({center, extent, color, onClick, onHover, active}: BoxProps) {
	const mesh = useRef()
	const activeColor = useMemo(() => new Color(color).lighten(0.6).hex(), [color]);
	const scale = useMemo(() => extent.asTuple(), [extent]);
	const geo = useMemo(() => center.asTuple(), [center]);
	const hoverIn = useCallback(() => onHover && onHover(true), [onHover]);
	const hoverOut = useCallback(() => onHover && onHover(false), [onHover]);

	return (
		<mesh
			ref={mesh}
			scale={scale}
			onClick={onClick}
			onPointerOver={hoverIn}
			onPointerOut={hoverOut}>
			<boxBufferGeometry args={geo} />
			<meshStandardMaterial color={active ? activeColor : color} />
		</mesh>
	)
}
