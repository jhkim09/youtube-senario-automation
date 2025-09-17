import Airtable from 'airtable';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing Airtable connection...');
console.log('API Key exists:', !!process.env.AIRTABLE_API_KEY);
console.log('Base ID:', process.env.AIRTABLE_BASE_ID);
console.log('Table Name:', process.env.AIRTABLE_TABLE_NAME || 'youtube');

if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  console.error('Missing Airtable credentials in .env file');
  console.log('\nPlease add to .env:');
  console.log('AIRTABLE_API_KEY=your_key_here');
  console.log('AIRTABLE_BASE_ID=app0nkN1bVRxJxxvO');
  console.log('AIRTABLE_TABLE_NAME=youtube');
  process.exit(1);
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const tableName = process.env.AIRTABLE_TABLE_NAME || 'table1';

// First, try to read records to test connection
console.log(`\nTrying to read from table: ${tableName}`);
base(tableName).select({
  maxRecords: 1,
  view: "Grid view"
}).firstPage((err, records) => {
  if (err) {
    console.error('Error reading from Airtable:', err);
    if (err.statusCode === 404) {
      console.log(`\nTable "${tableName}" not found. Available tables might be different.`);
      console.log('Please check your Airtable base for the correct table name.');
    } else if (err.statusCode === 403) {
      console.log('\nPermission denied. Please check:');
      console.log('1. Your API key has the correct permissions');
      console.log('2. The Base ID is correct');
      console.log('3. You have access to this base');
    }
    return;
  }

  console.log('✅ Successfully connected to Airtable!');
  console.log(`Found ${records.length} records in table "${tableName}"`);

  // Now try to create a test record
  console.log('\nTrying to create a test record...');
  base(tableName).create({
    'Topic': 'API 테스트',
    'Title': '테스트 제목',
    'Generated At': new Date().toISOString()
  }, (err, record) => {
    if (err) {
      console.error('Error creating record:', err);
      console.log('\nField names might be different. Check your Airtable table structure.');
    } else {
      console.log('✅ Successfully created test record!');
      console.log('Record ID:', record.id);
    }
  });
});