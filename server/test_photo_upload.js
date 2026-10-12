// Test profile photo upload and static serving
import http from 'http';
import { app } from './index.js';
import { db } from './db.js';
import { generateToken } from './middleware/auth.js';

let server;
let baseUrl;

async function testPhotoUpload() {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  try {
    const student = db.findUserById('usr_student_1');
    const token = generateToken(student);

    // Create a dummy 1x1 GIF / JPEG buffer
    const fakeImageBuffer = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;', 'binary');

    const boundary = '----WebKitFormBoundaryTest123';
    let body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="avatar.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      fakeImageBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    console.log('Testing Photo Upload POST...');
    const uploadRes = await fetch(`${baseUrl}/api/profile/photo/usr_student_1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body
    });

    const uploadData = await uploadRes.json();
    console.log('Upload Status:', uploadRes.status);
    console.log('Upload Response:', uploadData);

    if (uploadRes.status !== 200 || !uploadData.success) {
      throw new Error('Upload failed: ' + JSON.stringify(uploadData));
    }

    // Now test downloading the image
    console.log('Testing Image Static Fetch GET from:', uploadData.photoUrl);
    const getRes = await fetch(`${baseUrl}${uploadData.photoUrl}`);
    console.log('Static Photo Fetch Status:', getRes.status);
    if (getRes.status !== 200) {
      throw new Error('Static photo fetch returned ' + getRes.status);
    }

    console.log('✅ Photo upload & static serving test PASSED!');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

testPhotoUpload().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
