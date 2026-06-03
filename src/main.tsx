import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #0a0a0f; color: #e8e8f0; }
  body { font-family: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; line-height: 1.5; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2e2e3e; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #6b6b80; }
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
