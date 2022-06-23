import React, {useMemo} from 'react';
import {Box, Container, Divider, Stack} from "@mui/material";
import {useLocalStorage} from "./useLocalStorage";
import {bindRight, catchErr, Either, joinLeftRight, left, mapRight} from "./either";
import {SlabPreview} from "./SlabPreview";
import {TextInput} from "./inputs";
import {AssetLibrary, parseLibrary} from "./assets";
import {parseSlab} from "./slab-decoder";
import {Slab} from "./slab";

function useSlab(slabStr: string, maybeAssetLib: Either<AssetLibrary, string>): Either<Slab, string> {
	const maybeSlab = useMemo(() => catchErr(() => parseSlab(slabStr)), [slabStr]);
	return useMemo(() => {
		return bindRight(assetLib => mapRight(v2slab =>
			Slab.fromV2SlabAndLibrary(v2slab, assetLib), maybeSlab)
		, maybeAssetLib);
	}, [maybeAssetLib, maybeSlab])
}

function App() {
	const [assetLibCode, setAssetLibCode] = useLocalStorage("", 'assetLibrary');
	const maybeAssetLib = useMemo(() => catchErr(() => parseLibrary(JSON.parse(assetLibCode))), [assetLibCode]);
	const maybeAirship = useSlab(airship, maybeAssetLib);

	return (
		<Container>
			<Stack divider={<Divider/>} spacing={1}>
				<Box>
					<h2>Generate Slab</h2>
					<Box>
						<TextInput
							error={joinLeftRight(v => undefined, e => e, maybeAssetLib)}
							value={assetLibCode ? "***" : ""}
							onChange={setAssetLibCode}
							label="Asset Library Json (library.json)"/>
					</Box>
					<Box>
						{joinLeftRight(s => <SlabPreview slab={s}/>, e => null, maybeAirship)}
					</Box>
				</Box>
			</Stack>
		</Container>
	)
}

export default App;

const airship = "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"
