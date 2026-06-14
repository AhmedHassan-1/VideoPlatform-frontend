import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// NOTE: @import cannot be used inside style.textContent — moved to index.html as <link>
// Only inject runtime styles that don't conflict with index.html
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes spin   { to { transform: rotate(360deg); } }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
