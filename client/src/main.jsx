import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import FilePreviewApp from './app/FilePreviewApp.jsx';
import './styles/index.css';

const RootApp = window.location.pathname === '/preview/file' ? FilePreviewApp : App;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
