const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', err => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING CMS BACKEND SERVER API INTEGRATION TESTS ---');
  let token = '';
  let testItemId = '';

  try {
    // Test 1: POST Login
    console.log('Test 1: Login with admin password...');
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { password: 'admin123' });

    if (loginRes.statusCode === 200 && loginRes.body.success) {
      console.log('✅ Standard login successful!');
      token = loginRes.body.token;
    } else {
      throw new Error(`Standard login failed with status ${loginRes.statusCode}: ${JSON.stringify(loginRes.body)}`);
    }

    // Test 1b: POST Custom Login
    console.log('Test 1b: Login with custom email and security answer...');
    const customLoginRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'mdtavrejansari003@gmail.com', answer: 'Groniq' });

    if (customLoginRes.statusCode === 200 && customLoginRes.body.success) {
      console.log('✅ Custom email login successful!');
    } else {
      throw new Error(`Custom email login failed with status ${customLoginRes.statusCode}: ${JSON.stringify(customLoginRes.body)}`);
    }

    // Test 2: GET Content list
    console.log('Test 2: Retrieve database content catalog list...');
    const contentRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/content',
      method: 'GET'
    });

    if (contentRes.statusCode === 200 && contentRes.body.content) {
      console.log(`✅ Content retrieved successfully! Total items: ${contentRes.body.content.length}`);
    } else {
      throw new Error(`Content GET failed with status ${contentRes.statusCode}`);
    }

    // Test 3: POST Create Content (Authorized)
    console.log('Test 3: Create new test article publication...');
    const newPostPayload = {
      title: 'Automated API Test Article',
      type: 'articles',
      category: 'Analytics',
      tags: ['API Test', 'Automation'],
      excerpt: 'This is a test excerpt created automatically by the validation test script.',
      content: '<h2>Heading</h2><p>This is test content body. It has more than 300 characters to verify optimal seo rules. Let us write some more sentences. Systems thinking are essential to performance growth marketing. Tracking must be set up properly and we remove oxford commas before and after.</p>',
      seoTitle: 'Automated API Test Article',
      metaDescription: 'Meta description for the automated testing post to check lengths and parameters.',
      focusKeyword: 'systems thinking',
      slug: 'automated-api-test-article',
      canonicalUrl: ''
    };

    const createRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/content',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, newPostPayload);

    if (createRes.statusCode === 201 && createRes.body.success) {
      testItemId = createRes.body.item.id;
      console.log(`✅ Publication created successfully! ID: ${testItemId}`);
    } else {
      throw new Error(`Content creation failed with status ${createRes.statusCode}: ${JSON.stringify(createRes.body)}`);
    }

    // Test 4: Verify XML generation
    console.log('Test 4: Verify sitemap, robots, and RSS feeds are generated on publication...');
    const files = ['sitemap.xml', 'robots.txt', 'feed.xml'];
    files.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} generated successfully at workspace root!`);
      } else {
        console.warn(`❌ ${file} not found at path: ${filePath}`);
      }
    });

    // Test 5: PUT Edit Content
    console.log('Test 5: Update the test article content...');
    const updatePayload = {
      title: 'Automated API Test Article [Updated]',
      content: '<h2>Heading 2</h2><p>Updated test content body. It is working properly.</p>'
    };

    const updateRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/content/${testItemId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, updatePayload);

    if (updateRes.statusCode === 200 && updateRes.body.success) {
      console.log('✅ Publication updated successfully!');
    } else {
      throw new Error(`Content update failed with status ${updateRes.statusCode}`);
    }

    // Test 6: DELETE Content
    console.log('Test 6: Clean up and delete the test article...');
    const deleteRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/content/${testItemId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (deleteRes.statusCode === 200 && deleteRes.body.success) {
      console.log('✅ Publication deleted successfully!');
    } else {
      throw new Error(`Content deletion failed with status ${deleteRes.statusCode}`);
    }

    console.log('\n🌟 ALL CMS BACKEND INTEGRATION TESTS COMPLETED SUCCESSFULLY! 🌟');
  } catch (err) {
    console.error('\n❌ CMS INTEGRATION TEST FAILURE:', err.message);
    process.exit(1);
  }
}

// Run tests
runTests();
