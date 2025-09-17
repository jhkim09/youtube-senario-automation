import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// 환경 변수에서 가져오기 (또는 프롬프트로 입력받기)
const API_KEY = process.env.AIRTABLE_API_KEY || process.argv[2];
const BASE_ID = 'app0nk3oQJxZCqmDn';  // 성공한 Base ID

if (!API_KEY) {
  console.error('Usage: node test-airtable-debug.js <API_KEY>');
  console.error('Or set AIRTABLE_API_KEY in .env file');
  process.exit(1);
}

console.log('=== Airtable Direct API Debug Test ===\n');

// 환경 변수 확인
console.log('1. Configuration:');
console.log('   Base ID:', BASE_ID);
console.log('   Table Name: Table 1');

console.log('\n2. Testing Table Access with Direct API:');

const tableName = encodeURIComponent('Table 1');
const url = `https://api.airtable.com/v0/${BASE_ID}/${tableName}`;

// 먼저 테이블 읽기 테스트
console.log('   Reading table to check fields...');
try {
  const response = await fetch(url + '?maxRecords=1', {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('   Read Response Status:', response.status, response.statusText);
  const data = await response.json();

  if (response.ok) {
    console.log('   ✅ Successfully accessed table!');
    if (data.records && data.records.length > 0) {
      console.log('\n   Existing fields in table:');
      const fields = Object.keys(data.records[0].fields || {});
      fields.forEach(field => {
        const value = data.records[0].fields[field];
        console.log(`      - "${field}": ${typeof value} = ${JSON.stringify(value).substring(0, 50)}...`);
      });
    } else {
      console.log('   Table is empty');
    }
  } else {
    console.log('   ❌ Error reading table:', JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('   Error:', error.message);
}

console.log('\n3. Testing Record Creation with Direct API:');

// 서버에서 사용하는 것과 동일한 형식
const fullContent = `
주제: 테스트 주제
제목: 테스트 제목

=== 썸네일 아이디어 ===
테스트 썸네일

=== 인트로 ===
테스트 인트로

=== 본문 ===
테스트 본문 내용

=== 결론 ===
테스트 결론

=== 영상 설명 ===
테스트 설명

=== 태그 ===
테스트, 태그

생성 시간: ${new Date().toISOString()}
`.trim();

console.log('   Creating record with Attachment Summary field...');
try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        'Attachment Summary': fullContent
      }
    })
  });

  console.log('   Create Response Status:', response.status, response.statusText);
  const result = await response.json();

  if (response.ok) {
    console.log('   ✅ Record created successfully!');
    console.log('   Record ID:', result.id);
    console.log('   Created fields:', Object.keys(result.fields));
  } else {
    console.log('   ❌ Failed to create record:');
    console.log('   Error:', JSON.stringify(result, null, 2));

    if (result.error?.type === 'UNKNOWN_FIELD_NAME') {
      console.log('\n   "Attachment Summary" field not found. Trying other field names...');

      // 다른 필드 이름들 시도
      const fieldAttempts = [
        { 'Name': '테스트 이름' },
        { 'Title': '테스트 제목' },
        { 'Content': fullContent },
        { 'Notes': fullContent },
        { 'Description': fullContent }
      ];

      for (const fields of fieldAttempts) {
        console.log(`\n   Trying fields:`, Object.keys(fields));
        try {
          const testResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields })
          });

          const testResult = await testResponse.json();

          if (testResponse.ok) {
            console.log(`   ✅ Success with fields:`, Object.keys(fields));
            console.log(`   Record ID:`, testResult.id);
            break;
          } else {
            console.log(`   ❌ Failed:`, testResult.error?.message || 'Unknown error');
          }
        } catch (err) {
          console.log(`   ❌ Error:`, err.message);
        }
      }
    }
  }
} catch (error) {
  console.error('   Error:', error.message);
}

console.log('\n=== End of Debug Test ===');