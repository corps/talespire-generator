import React, {useEffect, useMemo, useState} from 'react';
import {Box, Container} from "@mui/material";
import {SlabPreview} from "./SlabPreview";
import {AutoInput, useAutoInput} from "./autoinputs";
import {SlabInput} from "./SlabInput";
import {useLocalStorage} from "./useLocalStorage";
import {AssetLibraryInput} from "./AssetLibraryInput";


const Editor = AutoInput.apply(
	SlabInput,
	AssetLibraryInput
)

const noop = () => null;
function App() {
	const [defaultSlabJson, setSlabJson] = useLocalStorage(Editor.defaultState, 'slab');
	const [slabJson, slab, pasteSlabInput] = useAutoInput(Editor, noop, defaultSlabJson);
	useEffect(() => setSlabJson(slabJson), [setSlabJson, slabJson]);

	return (
		<Container>
			<Box>
				{pasteSlabInput}
			</Box>
			<Box>
				{/*<SlabPreview slab={slab}/>*/}
			</Box>
		</Container>
	)
}

export default App;

