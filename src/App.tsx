import React, {useMemo} from 'react';
import {Box, Container, Divider, Stack} from "@mui/material";
import {Slab, SlabInput} from "./SlabInput";
import {useLocalStorage} from "./useLocalStorage";
import {AssetLibraryInput} from "./AssetLibraryInput";
import {useAutoInput} from "./autoinputs";
import {bindRight, joinLeftRight, mapRight} from "./either";
import {SlabPipeline} from "./SlabOperation";
import {SlabPreview} from "./SlabPreview";

function App() {
	const [slabCode, setSlabCode] = useLocalStorage("", 'pastedSlab');
	const [assetLibCode, setAssetLibCode] = useLocalStorage("", 'assetLibrary');

	const [slabFactory, slabInput] = useAutoInput(SlabInput, slabCode => setSlabCode(slabCode), slabCode);
	const [assetLibrary, libraryInput] = useAutoInput(AssetLibraryInput, assetCode => setAssetLibCode(assetCode), assetLibCode);
	const decodedSlab = useMemo(() => bindRight(f => mapRight(p => f(p), assetLibrary), slabFactory), [assetLibrary, slabFactory]);
	const slabPipeline = useMemo(() => SlabPipeline(joinLeftRight(s => s, e => new Slab('', {}), decodedSlab)), [decodedSlab])
	const [slab, pipelineInput] = useAutoInput(slabPipeline);

	return (
		<Container>
			<Stack divider={<Divider/>} spacing={1}>
				<Box>
					<h2>Generate Slab</h2>
					<Box>
						{slabInput}
						{libraryInput}
					</Box>
					<Box>
						{joinLeftRight(s => <SlabPreview slab={s}/>, e => null, decodedSlab)}
					</Box>
				</Box>
				{pipelineInput}
			</Stack>
		</Container>
	)
}

export default App;

