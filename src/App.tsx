import React from 'react';
import {Box, Container} from "@mui/material";
import {SlabPreview} from "./SlabPreview";
import {Slab, SlabInput} from "./SlabInput";
import {useLocalStorage} from "./useLocalStorage";
import {Asset, AssetLibraryInput} from "./AssetLibraryInput";
import {useAutoInput} from "./autoinputs";
import {bindRight, joinLeftRight, mapRight} from "./either";
import {SlabPipelineInput} from "./SlabOperation";

const SlabAndAssetInput = SlabInput.bind(slab =>
	AssetLibraryInput.map(assetLib => bindRight(f => mapRight(p => f(p), assetLib), slab)));

function App() {
	const [slabCode, setSlabCode] = useLocalStorage("", 'pastedSlab');
	const [assetLibCode, setAssetLibCode] = useLocalStorage("", 'assetLibrary');

	const [_, decodedSlab, setupInput] = useAutoInput(SlabAndAssetInput, ([slab, asset]) => {
		setSlabCode(slab);
		setAssetLibCode(asset);
	}, [slabCode, assetLibCode] as [string, string]);

	const [__, pipeline, pipelineInput] = useAutoInput(SlabPipelineInput);

	// decodedSlab = mapRight(slab => bindRight())

	return (
		<Container>
			<Box>
				{setupInput}
			</Box>
			<Box>
				{ joinLeftRight(slab => <>
					{pipelineInput}
					<SlabPreview slab={slab}/>
				</>, err => null, decodedSlab) }
			</Box>
		</Container>
	)
}

export default App;

