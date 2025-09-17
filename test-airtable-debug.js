import Airtable from 'airtable';
import dotenv from 'dotenv';

dotenv.config();

console.log('=== Airtable Debug Test ===\n');

// 환경 변수 확인
console.log('1. Environment Variables:');
console.log('   API Key exists:', !!process.env.AIRTABLE_API_KEY);
console.log('   API Key prefix:', process.env.AIRTABLE_API_KEY ? process.env.AIRTABLE_API_KEY.substring(0, 3) : 'N/A');
console.log('   Base ID:', process.env.AIRTABLE_BASE_ID);
console.log('   Table Name:', process.env.AIRTABLE_TABLE_NAME || 'table1');

if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  console.error('\n❌ Missing credentials. Please set:');
  console.log('   AIRTABLE_API_KEY=pat...');
  console.log('   AIRTABLE_BASE_ID=app0nkN1bVRxJxxvO');
  process.exit(1);
}

console.log('\n2. Testing Base Access:');

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
  endpointUrl: 'https://api.airtable.com'
}).base(process.env.AIRTABLE_BASE_ID);

// 테이블 이름 테스트
const tableNames = ['table1', 'youtube', 'Table1', 'Youtube', 'Table 1'];
let workingTable = null;

console.log('\n3. Testing different table names:');

for (const tableName of tableNames) {
  try {
    console.log(`   Testing "${tableName}"...`);

    await new Promise((resolve, reject) => {
      base(tableName).select({
        maxRecords: 1,
        view: "Grid view"
      }).firstPage((err, records) => {
        if (err) {
          console.log(`      ❌ Failed: ${err.message}`);
          if (err.statusCode === 404) {
            console.log(`         → Table "${tableName}" not found`);
          } else if (err.statusCode === 403) {
            console.log(`         → Permission denied for table "${tableName}"`);
          }
          reject(err);
        } else {
          console.log(`      ✅ Success! Found ${records.length} records`);
          workingTable = tableName;
          resolve(records);
        }
      });
    }).catch(() => {}); // Catch to continue loop

    if (workingTable) break;
  } catch (error) {
    // Continue to next table name
  }
}

if (!workingTable) {
  console.log('\n❌ No working table found. Possible issues:');
  console.log('   1. API token doesn\'t have correct permissions');
  console.log('   2. Base ID is incorrect');
  console.log('   3. Table name is different from tested names');

  console.log('\n4. Testing base metadata access:');

  // Try to get base schema (requires different permissions)
  try {
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Can access base metadata');
      console.log('   Available tables:');
      data.tables.forEach(table => {
        console.log(`      - ${table.name} (${table.id})`);
      });
    } else {
      console.log('   ❌ Cannot access base metadata');
      console.log('      Status:', response.status);
      const errorText = await response.text();
      console.log('      Error:', errorText);
    }
  } catch (error) {
    console.log('   ❌ Error accessing metadata:', error.message);
  }
} else {
  console.log(`\n✅ Working table found: "${workingTable}"`);

  console.log('\n5. Testing record creation:');

  const testRecord = {
    'Topic': 'API 권한 테스트',
    'Title': '테스트 제목',
    'Generated At': new Date().toISOString()
  };

  console.log('   Creating test record...');
  console.log('   Fields:', JSON.stringify(testRecord, null, 2));

  base(workingTable).create(testRecord, (err, record) => {
    if (err) {
      console.log(`   ❌ Failed to create record: ${err.message}`);

      if (err.message.includes('UNKNOWN_FIELD_NAME')) {
        console.log('\n   Field name issue detected. Trying to get table schema...');

        // List first record to see field structure
        base(workingTable).select({
          maxRecords: 1
        }).firstPage((err, records) => {
          if (!err && records.length > 0) {
            console.log('\n   Existing record fields:');
            Object.keys(records[0].fields).forEach(field => {
              console.log(`      - ${field}: ${typeof records[0].fields[field]}`);
            });
          }
        });
      }
    } else {
      console.log(`   ✅ Record created successfully!`);
      console.log(`      Record ID: ${record.id}`);
      console.log(`      Fields:`, record.fields);
    }
  });
}

console.log('\n=== End of Debug Test ===');