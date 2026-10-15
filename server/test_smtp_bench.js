import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const user = process.env.SMTP_USER || process.env.GMAIL_USER;
const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

console.log('Testing SMTP connection for user:', user);

async function testPort(port, secure) {
  console.log(`\nTesting port ${port} (secure=${secure})...`);
  const start = Date.now();
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  try {
    await transport.verify();
    console.log(`✅ Port ${port} verified in ${Date.now() - start}ms`);
  } catch (e) {
    console.error(`❌ Port ${port} failed in ${Date.now() - start}ms: ${e.message}`);
  }
}

async function testServiceGmail() {
  console.log('\nTesting service: "gmail" (Nodemailer built-in provider)...');
  const start = Date.now();
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 10000
  });

  try {
    await transport.verify();
    console.log(`✅ service: "gmail" verified in ${Date.now() - start}ms`);
  } catch (e) {
    console.error(`❌ service: "gmail" failed in ${Date.now() - start}ms: ${e.message}`);
  }
}

async function testSend() {
  console.log('\nTesting real send with fresh transporter...');
  const t0 = Date.now();
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  const info = await transporter.sendMail({
    from: `"JSPM Code Validator" <${user}>`,
    to: user,
    subject: 'Speed Test Fresh',
    text: 'Test content'
  });
  console.log(`✅ Dispatched email in ${Date.now() - t0}ms. MessageId: ${info.messageId}`);
}

async function run() {
  await testPort(465, true);
  await testPort(587, false);
  await testServiceGmail();
  await testSend();
}

run();
