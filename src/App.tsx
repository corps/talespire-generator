import React, {useEffect, useMemo, useState} from 'react';
import {Box, Container} from "@mui/material";
import {SlabPreview} from "./SlabPreview";
import {Slab, slabFromText} from "./slabFromText";
import {useLocalStorage} from "./useLocalStorage";
import {assetLibraryFromText} from "./assetLibraryFromText";
import {useAutoMemo} from "./automemo";
import {bindParams, useBoundInput} from "./autoinputs";
import {TextInput} from "./inputs";
import {bindRight, mapRight} from "./either";
import {ShowResult} from "./WithError";

const SlabInput = bindParams(TextInput, {label: "Slab"});
const LibraryInput = bindParams(TextInput, {label: "Asset Library (index.json)"});

function App() {
	const [slabInput, slabText, _, slabFromAssetLibrary] = useBoundInput(SlabInput,
		...useLocalStorage(slabFromText.defaultState, 'pastedSlab'), slabFromText);
	const [libraryInput, libraryText, __, assetLibrary] = useBoundInput(LibraryInput,
		...useLocalStorage(assetLibraryFromText.defaultState, 'assetLibrary'), assetLibraryFromText);

	const slab = bindRight(f => mapRight(p => f(p), assetLibrary), slabFromAssetLibrary);

	return (
		<Container>
			<Box>
				{slabInput}
				{libraryInput}
			</Box>
			<Box>
				<ShowResult value={mapRight(slab => <SlabPreview slab={slab}/>, slab)}/>
			</Box>
		</Container>
	)
}

export default App;

