import React, {useState} from 'react';
import {Box, Tab, Tabs} from "@mui/material";

interface Props {
	options: Record<string, React.ReactElement | null>,
}

export function TabSet({options}: Props) {
	const [value, onChange] = useState(() => Object.keys(options)[0]);

	return <Box>
		<Box>
			<Tabs value={value} onChange={(_, v) => onChange(v)}>
				{Object.keys(options).map(option => <Tab key={option} label={option} value={option} />)}
			</Tabs>
		</Box>
		<Box>
			{value in options ? options[value] : null}
		</Box>
	</Box>;
}
