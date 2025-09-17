import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'app0nkN1bVRxJxxvO';

console.log('=== Simple Airtable API Test ===\n');
console.log('API Key prefix:', API_KEY ? API_KEY.substring(0, 7) + '...' : 'Not set');
console.log('Base ID:', BASE_ID);
console.log('');

if (!API_KEY) {
  console.error('Please set AIRTABLE_API_KEY in .env file');
  process.exit(1);
}

// 1. Base 정보 가져오기
console.log('1. Testing base access with direct API call:');
console.log('   URL: https://api.airtable.com/v0/' + BASE_ID + '/table1\n');

try {
  const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/table1?maxRecords=1`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('   Response Status:', response.status, response.statusText);

  const data = await response.json();

  if (response.ok) {
    console.log('   ✅ Successfully accessed table!');
    if (data.records && data.records.length > 0) {
      console.log('\n   First record fields:');
      const fields = Object.keys(data.records[0].fields || {});
      fields.forEach(field => {
        console.log(`      - "${field}"`);
      });
    } else {
      console.log('   No records found in table');
    }
  } else {
    console.log('   ❌ Error:', JSON.stringify(data, null, 2));

    if (response.status === 403) {
      console.log('\n   Possible issues:');
      console.log('   1. Token doesn\'t have access to this specific base');
      console.log('   2. Base is in a different workspace');
      console.log('   3. Token permissions are not applied yet (try regenerating)');
    } else if (response.status === 404) {
      console.log('\n   Table "table1" not found. Trying "youtube"...');

      const response2 = await fetch(`https://api.airtable.com/v0/${BASE_ID}/youtube?maxRecords=1`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('\n   Response Status for "youtube":', response2.status, response2.statusText);
      const data2 = await response2.json();
      console.log('   Result:', JSON.stringify(data2, null, 2));
    }
  }

  // 2. 레코드 생성 테스트
  if (response.ok) {
    console.log('\n2. Testing record creation:');

    const testData = {
      "fields": {
        "Topic": "Test from API",
        "Title": "Test Title"
      }
    };

    console.log('   Sending:', JSON.stringify(testData, null, 2));

    const createResponse = await fetch(`https://api.airtable.com/v0/${BASE_ID}/table1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const createResult = await createResponse.json();

    if (createResponse.ok) {
      console.log('   ✅ Record created successfully!');
      console.log('   Record ID:', createResult.id);
    } else {
      console.log('   ❌ Failed to create record:');
      console.log('   ', JSON.stringify(createResult, null, 2));

      if (createResult.error?.type === 'UNKNOWN_FIELD_NAME') {
        console.log('\n   Field names don\'t match. Check your Airtable table for exact field names.');
      }
    }
  }

} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n=== End of Test ===');