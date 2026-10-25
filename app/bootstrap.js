// The deployed site keeps its demonstration state in this browser. Local development
// continues to use the Node server and its real Kane CLI integration.
if (!['localhost', '127.0.0.1'].includes(location.hostname)) await import('./hosted-api.js');
await import(location.pathname.endsWith('/store.html') ? './store.js' : './app.js');
