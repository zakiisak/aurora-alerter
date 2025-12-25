/**
 * Test script for Brevo email sending
 * Run with: node test-brevo.js
 */

import dotenv from 'dotenv';
dotenv.config();

import brevo from '@getbrevo/brevo';

// Configure Brevo API client
const defaultClient = brevo.ApiClient.instance;
const apiKeyAuth = defaultClient.authentications['api-key'];
apiKeyAuth.apiKey = process.env.BREVO_API_KEY || '';

if (!process.env.BREVO_API_KEY) {
  console.error('❌ Error: BREVO_API_KEY is not set in your .env file');
  console.error('   Please add BREVO_API_KEY=your_api_key_here to your .env file');
  process.exit(1);
}

// Get sender email from environment
const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@example.com';
const senderName = process.env.BREVO_SENDER_NAME || 'Aurora Alerter';

// Test recipient (change this to your email)
const testRecipient = process.env.TEST_EMAIL || 'test@example.com';

console.log('🧪 Testing Brevo email sending...\n');
console.log(`From: ${senderName} <${senderEmail}>`);
console.log(`To: ${testRecipient}\n`);

// Create email
const apiInstance = new brevo.TransactionalEmailsApi();
const sendSmtpEmail = new brevo.SendSmtpEmail();

sendSmtpEmail.subject = '🧪 Test Email from Aurora Alerter';
sendSmtpEmail.htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🧪 Test Email</h1>
      </div>
      <div class="content">
        <p>This is a test email from Aurora Alerter using Brevo!</p>
        <p>If you received this email, your Brevo integration is working correctly. ✅</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      </div>
    </div>
  </body>
  </html>
`;

sendSmtpEmail.textContent = `
Test Email from Aurora Alerter

This is a test email from Aurora Alerter using Brevo!

If you received this email, your Brevo integration is working correctly.

Timestamp: ${new Date().toISOString()}
`;

sendSmtpEmail.sender = { name: senderName, email: senderEmail };
sendSmtpEmail.to = [{ email: testRecipient }];
sendSmtpEmail.replyTo = { email: senderEmail, name: senderName };

// Send email
try {
  console.log('📤 Sending email via Brevo API...\n');
  const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
  
  console.log('✅ Email sent successfully!');
  console.log(`   Message ID: ${response.messageId || 'N/A'}`);
  console.log(`   Full Response:`, JSON.stringify(response, null, 2));
  console.log(`\n📧 Check your inbox at: ${testRecipient}`);
  console.log(`\n🔍 Current Configuration:`);
  console.log(`   Sender: ${senderEmail}`);
  console.log(`   Recipient: ${testRecipient}`);
  console.log(`\n💡 Troubleshooting if email not received:`);
  console.log(`\n   1. ⚠️  VERIFY SENDER EMAIL (Most Important!):`);
  console.log(`      → Go to: https://app.brevo.com/settings/senders/new`);
  console.log(`      → Add sender email: ${senderEmail}`);
  console.log(`      → Click the verification link sent to that email`);
  console.log(`      → Without verification, emails won't be delivered!`);
  console.log(`\n   2. Check Brevo Dashboard for delivery status:`);
  console.log(`      → Go to: https://app.brevo.com/transactional/emails`);
  console.log(`      → Look for Message ID: ${response.messageId || 'N/A'}`);
  console.log(`      → Check the delivery status (sent, delivered, bounced, etc.)`);
  console.log(`\n   3. Check your spam/junk folder`);
  console.log(`\n   4. Wait 2-5 minutes - emails can be delayed`);
  console.log(`\n   5. Verify the recipient email address is correct: ${testRecipient}`);
  console.log(`\n   6. If using a free Brevo account, check your sending limits`);
  console.log(`      → Free accounts have daily sending limits`);
} catch (error) {
  console.error('❌ Failed to send email:\n');
  
  if (error.response) {
    console.error(`   HTTP Status: ${error.response.status}`);
    console.error(`   Response Body:`, JSON.stringify(error.response.body || error.response.text, null, 2));
    
    if (error.response.status === 401) {
      console.error('\n💡 Authentication Error:');
      console.error('   - Your BREVO_API_KEY might be incorrect');
      console.error('   - Make sure you\'re using a v3 API key (not SMTP credentials)');
      console.error('   - Get your API key from: https://app.brevo.com/settings/keys/api');
    } else if (error.response.status === 400) {
      console.error('\n💡 Bad Request Error:');
      console.error('   - Your sender email might not be verified in Brevo');
      console.error('   - Go to: https://app.brevo.com/settings/senders/new');
      console.error('   - Verify your sender email address');
      console.error('   - Check that email format is correct');
    }
  } else if (error.body) {
    console.error(`   Error Body:`, JSON.stringify(error.body, null, 2));
  } else {
    console.error(`   Error Message:`, error.message || error);
    console.error(`   Full Error:`, error);
  }
  
  process.exit(1);
}

