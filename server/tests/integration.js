require('dotenv').config();
const http = require('http');
const app = require('../src/app');
const mongoose = require('mongoose');

const PORT = 5001;
let server;

const startServer = () => {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      resolve();
    });
  });
};

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

const runTests = async () => {
  try {
    // 1. Connect mongoose first (since app doesn't connect DB itself, server.js does)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu');
    console.log('Test database connected.');

    // 2. Start local test server
    await startServer();

    console.log('\n--- Running API Integration Tests ---');

    // Test 1: Health Check
    console.log('Test 1: GET /health');
    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/health',
      method: 'GET'
    });
    console.log(`Response Code: ${healthRes.statusCode}`);
    if (healthRes.statusCode !== 200 || healthRes.body.status !== 'ok') {
      throw new Error('Health check test failed');
    }
    console.log('✅ Health check passed.');

    // Test 2: Public Products Catalog
    console.log('\nTest 2: GET /api/v1/products');
    const prodRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/products',
      method: 'GET'
    });
    console.log(`Response Code: ${prodRes.statusCode}`);
    if (prodRes.statusCode !== 200 || !prodRes.body.success) {
      throw new Error('Products catalog listing test failed');
    }
    console.log(`Found ${prodRes.body.data.length} seeded products.`);
    console.log('✅ Catalog listing passed.');

    // Test 3: Customer Send OTP
    console.log('\nTest 3: POST /api/v1/auth/otp/send');
    const otpRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/auth/otp/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { phone: '9825000000' });
    console.log(`Response Code: ${otpRes.statusCode}`);
    if (otpRes.statusCode !== 200 || !otpRes.body.success) {
      throw new Error('OTP send test failed');
    }
    console.log(`Simulated code received: ${otpRes.body.data.otp}`);
    console.log('✅ OTP send passed.');

    // Test 4: Customer Verify OTP (using mock code)
    console.log('\nTest 4: POST /api/v1/auth/otp/verify');
    const verifyRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/auth/otp/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { phone: '9825000000', otp: '123456' }); // bypass code
    console.log(`Response Code: ${verifyRes.statusCode}`);
    if (verifyRes.statusCode !== 200 || !verifyRes.body.success) {
      throw new Error('OTP verification test failed');
    }
    console.log(`Logged in as: ${verifyRes.body.data.user.name}`);
    console.log(`Token issued: ${verifyRes.body.data.accessToken.substring(0, 15)}...`);
    console.log('✅ OTP verification passed.');

    console.log('\n🎉 All backend integration tests passed successfully!');
    cleanup(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    cleanup(1);
  }
};

const cleanup = (code) => {
  if (server) {
    server.close(() => {
      mongoose.disconnect().then(() => {
        process.exit(code);
      });
    });
  } else {
    process.exit(code);
  }
};

runTests();
