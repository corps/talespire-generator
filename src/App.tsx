import React, {useMemo} from 'react';
import {deflate, ungzip} from "pako";

function App() {
	const [SlabInput, value] = useTap(useMemo(() => build(AutoMultilineString).bind("").map(decodeSlab).Input, []));

	return (<div className="mw7 center pa4">
			<SlabInput onChange={noop}/>
			<textarea value={value}
								readOnly
								className="input-reset ba b--black-20 pa2 mb2 db w-100"
			/>
		</div>);
}

export default App;

