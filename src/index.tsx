import React from 'react';
import './index.css';
import App from './App';
import {createRoot} from "react-dom/client";

const root = createRoot(document.getElementById('root') as any);

root.render(
  <React.StrictMode>
		<link
			rel="stylesheet"
			href="https://fonts.googleapis.com/icon?family=Material+Icons"
		/>
		<link
			rel="stylesheet"
			href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
		/>
		<meta name="viewport" content="initial-scale=1, width=device-width" />
		<App />
  </React.StrictMode>,
);
