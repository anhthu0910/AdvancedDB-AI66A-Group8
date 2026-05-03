import React from 'react';
import ReactDOM from 'react-dom/client';
import TransactionExplorer from './pages/TransactionExplorer';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TransactionExplorer />
  </React.StrictMode>
);
