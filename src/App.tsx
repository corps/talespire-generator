import React, {useEffect, useMemo, useState} from 'react';
import {Box, Button, Container} from "@mui/material";
import {SlabPreview} from "./SlabPreview";
import {Slab, slabFromText} from "./slabFromText";
import {useLocalStorage} from "./useLocalStorage";
import {assetLibraryFromText} from "./assetLibraryFromText";
import {bindParams, useBoundInput} from "./autoinputs";
import {TextInput} from "./inputs";
import {bindRight, isRight, mapRight} from "./either";
import {ShowResult} from "./WithError";

const SlabInput = bindParams(TextInput, {label: "Slab"});
const LibraryInput = bindParams(TextInput, {label: "Asset Library (index.json)", value: ""});

function App() {
	const [slabInput, slabText, _, slabFromAssetLibrary] = useBoundInput(SlabInput,
		...useLocalStorage(slabFromText.defaultState, 'pastedSlab'), slabFromText);
	const [libraryInput, libraryText, __, assetLibrary] = useBoundInput(LibraryInput,
		...useLocalStorage(assetLibraryFromText.defaultState, 'assetLibrary'), assetLibraryFromText);
	const [showLibraryInput, setShowLibraryInput] = useState(false);

	useEffect(() => {
		if (isRight(assetLibrary)) {
			setShowLibraryInput(false);
		}
	}, [assetLibrary]);

	const slab = bindRight(f => mapRight(p => f(p), assetLibrary), slabFromAssetLibrary);

	return (
		<Container>
			<Box>
				{slabInput}
				{showLibraryInput ? libraryInput : <Button onClick={() => setShowLibraryInput(true)}>Edit Asset Library</Button>}
			</Box>
			<Box>
				<ShowResult value={mapRight(slab => <SlabPreview slab={slab}/>, slab)}/>
			</Box>
		</Container>
	)
}

export default App;

