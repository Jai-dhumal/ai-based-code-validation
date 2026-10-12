import { app } from './index.js';
import http from 'http';

const server = http.createServer(app);
server.listen(0, async () => {
  const port = server.address().port;
  console.log('Test server running on port:', port);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dhumaljai@gmail.com', role: 'student' })
    });

    const data = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Response body:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
