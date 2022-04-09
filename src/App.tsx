import React, {useEffect, useMemo, useState} from 'react';
import {Box, Container} from "@mui/material";
import {SlabPreview} from "./SlabPreview";
import {Slab, slabFromText} from "./slabFromText";
import {useLocalStorage} from "./useLocalStorage";
import {assetLibraryFromText} from "./assetLibraryFromText";
import {useAutoMemo} from "./automemo";
import {bindValue} from "./autoinputs";
import {TextInput} from "./TextInput";
import {bindRight, mapRight} from "./either";
import {ShowError, ShowResult} from "./WithError";

function App() {
	const [slabInput, slabText] = bindValue(TextInput,
		...useLocalStorage(slabFromText.defaultState, 'pastedSlab'));
	const [libraryInput, libraryText] = bindValue(TextInput,
		...useLocalStorage(assetLibraryFromText.defaultState, 'assetLibrary'));

	const slabFromAssetLibrary = useAutoMemo(slabFromText, slabText);
	const assetLibrary = useAutoMemo(assetLibraryFromText, libraryText);
	const slab = bindRight(f => mapRight(p => f(p), assetLibrary), slabFromAssetLibrary);

	return (
		<Container>
			<Box>
				{slabInput}
				<ShowError value={slabFromAssetLibrary}/>
			</Box>
			<Box>
				{libraryInput}
				<ShowError value={assetLibrary}/>
			</Box>
			<Box>
				<ShowResult value={mapRight(slab => <SlabPreview slab={slab}/>, slab)}/>
			</Box>
		</Container>
	)
}

export default App;

