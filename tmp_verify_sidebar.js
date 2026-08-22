const cp = require('child_process');
const fs = require('fs');
const http = require('http');

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9333;
const profile = `${process.cwd()}/tmp-chrome-profile`;
fs.mkdirSync(profile, { recursive: true });

const browser = cp.spawn(chrome, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--disable-gpu',
  '--window-size=1280,900',
  'http://127.0.0.1:3000/capture.html',
], { stdio: 'ignore' });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getJson = (path) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => resolve(JSON.parse(data)));
  }).on('error', reject);
});

async function main() {
  for (let i = 0; i < 30; i += 1) {
    try {
      const targets = await getJson('/json/list');
      if (targets[0]) {
        const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
        let id = 0;
        const pending = new Map();
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.id && pending.has(message.id)) {
            pending.get(message.id)(message);
            pending.delete(message.id);
          }
        };
        await new Promise((resolve) => { ws.onopen = resolve; });
        const send = (method, params = {}) => new Promise((resolve) => {
          const call = { id: ++id, method, params };
          pending.set(call.id, resolve);
          ws.send(JSON.stringify(call));
        });

        await send('Page.enable');
        await wait(700);
        await send('Runtime.evaluate', {
          expression: "document.getElementById('right-sidebar')?.classList.add('expanded'); document.body.classList.add('theme-dark');",
        });
        await wait(500);
        const screenshot = await send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        if (!screenshot.result?.data) {
          throw new Error(`Screenshot capture failed: ${JSON.stringify(screenshot)}`);
        }
        fs.writeFileSync('tmp-right-sidebar.png', Buffer.from(screenshot.result.data, 'base64'));
        console.log('wrote tmp-right-sidebar.png');
        ws.close();
        browser.kill();
        return;
      }
    } catch (error) {
      await wait(250);
    }
  }
  throw new Error('Chrome DevTools target not ready');
}

main().catch((error) => {
  try { browser.kill(); } catch {}
  console.error(error);
  process.exit(1);
});
