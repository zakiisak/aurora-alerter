/**
 * Helper script to check .env configuration
 * Run with: node check-env.js
 */

import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

console.log('🔍 Checking .env configuration...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.error('❌ .env file not found!');
  console.log('\nPlease create a .env file with the following:');
  console.log('MAILERSEND_API_KEY=your_api_key_here');
  process.exit(1);
}

console.log('✅ .env file exists\n');

// Check required variables
const required = {
  'MAILERSEND_API_KEY': process.env.MAILERSEND_API_KEY,
};

const optional = {
  'MAILERSEND_SENDER_EMAIL': process.env.MAILERSEND_SENDER_EMAIL,
  'MAILERSEND_SENDER_NAME': process.env.MAILERSEND_SENDER_NAME,
  'PORT': process.env.PORT,
  'DB_PATH': process.env.DB_PATH,
};

let hasErrors = false;

console.log('Required variables:');
for (const [key, value] of Object.entries(required)) {
  if (!value || value.trim() === '') {
    console.log(`  ❌ ${key}: NOT SET`);
    hasErrors = true;
  } else if (value.includes('your_') || value.includes('example')) {
    console.log(`  ⚠️  ${key}: Set but appears to be a placeholder`);
    hasErrors = true;
  } else {
    // Show first and last 4 characters for security
    const masked = value.length > 8 
      ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
      : '***';
    console.log(`  ✅ ${key}: ${masked}`);
  }
}

console.log('\nOptional variables:');
for (const [key, value] of Object.entries(optional)) {
  if (value) {
    console.log(`  ✅ ${key}: ${value}`);
  } else {
    console.log(`  ⚪ ${key}: Not set (using default)`);
  }
}

if (hasErrors) {
  console.log('\n❌ Configuration issues found!');
  console.log('\nTo fix:');
  console.log('1. Open your .env file');
  console.log('2. Set MAILERSEND_API_KEY to your actual MailerSend API key');
  console.log('3. Get your API key from: https://www.mailersend.com');
  console.log('4. Restart your server after making changes');
  process.exit(1);
} else {
  console.log('\n✅ All required configuration looks good!');
  console.log('\nIf you\'re still getting "Unauthenticated" errors:');
  console.log('1. Verify your API key is correct in MailerSend dashboard');
  console.log('2. Make sure the API key has email sending permissions');
  console.log('3. Check that your sender email domain is verified in MailerSend');
}

