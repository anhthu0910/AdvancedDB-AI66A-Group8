const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/transactions/bulk?count=100',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};

const start = Date.now();
const requests = 10; // Tổng 1000 tx (10 request * 100 tx)

function sendRequest(i) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.write('{}');
    req.end();
  });
}

async function run() {
  console.log(`🚀 Sending ${requests} bulk requests (100 tx each)...`);
  await Promise.all(Array.from({ length: requests }, (_, i) => sendRequest(i)));
  const duration = (Date.now() - start) / 1000;
  const throughput = Math.round((requests * 100) / duration);
  console.log(`✅ Done in ${duration.toFixed(2)}s → Throughput: ~${throughput} tx/s`);
}

run();