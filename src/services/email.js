/**
 * Email notification service using MailerSend
 */

import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

// Lazy initialization of MailerSend client
// This ensures dotenv.config() has been called before we read the API key
let mailersend = null;

function getMailerSendClient() {
  if (!mailersend) {
    const apiKey = process.env.MAILERSEND_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  WARNING: MAILERSEND_API_KEY is not set in environment variables');
      console.warn('   Email sending will fail. Please add MAILERSEND_API_KEY to your .env file');
    }
    mailersend = new MailerSend({
      apiKey: apiKey || '',
    });
  }
  return mailersend;
}

// Aurora forecast links
const AURORA_IMAGE_URL = 'https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg';
const AURORA_FORECAST_URL = 'https://www.swpc.noaa.gov/products/aurora-30-minute-forecast';

/**
 * Send aurora alert email
 * @param {string} toEmail - Recipient email address
 * @param {Object} alertData - Alert information
 * @param {number} alertData.auroraValue - Current aurora probability value
 * @param {number} alertData.threshold - Alert threshold
 * @param {number} alertData.latitude - Alert latitude
 * @param {number} alertData.longitude - Alert longitude
 * @param {string} alertData.cityName - City name for the location
 */
export async function sendAuroraAlert(toEmail, alertData) {
  const { auroraValue, threshold, latitude, longitude, cityName = 'Unknown Location' } = alertData;

  // Get sender email from environment (or use a default)
  const senderEmail = process.env.MAILERSEND_SENDER_EMAIL || 'noreply@test-r9084zv19omgw63d.mlsender.net';
  const senderName = process.env.MAILERSEND_SENDER_NAME || 'Aurora Alerter';

  // Check if API key is configured (read it now, after dotenv has loaded)
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    const error = new Error('MailerSend API key is not configured. Please set MAILERSEND_API_KEY in your .env file');
    console.error(`Error sending email to ${toEmail}:`, error.message);
    throw error;
  }

  // Get MailerSend client (lazy initialization)
  const client = getMailerSendClient();

  try {
    const emailParams = new EmailParams()
      .setFrom(new Sender(senderEmail, senderName))
      .setTo([new Recipient(toEmail)])
      .setReplyTo(new Recipient(senderEmail, senderName))
      .setSubject(`🌌 Aurora Alert: ${cityName} Level ${auroraValue} Detected!`)
      .setHtml(buildEmailHtml(auroraValue, threshold, latitude, longitude, cityName))
      .setText(buildEmailText(auroraValue, threshold, latitude, longitude, cityName));

    const response = await client.email.send(emailParams);
    console.log(`Email sent successfully to ${toEmail}:`, response.statusCode || response.status);
    return { success: true, response };
  } catch (error) {
    // Provide more detailed error information
    if (error.message && error.message.includes('Unauthenticated')) {
      console.error(`❌ MailerSend authentication failed. Please check:`);
      console.error(`   1. MAILERSEND_API_KEY is set in your .env file`);
      console.error(`   2. The API key is valid and has email sending permissions`);
      console.error(`   3. You've restarted the server after adding the API key`);
    }
    console.error(`Error sending email to ${toEmail}:`, error.message || error);
    throw error;
  }
}

/**
 * Build HTML email content
 */
function buildEmailHtml(auroraValue, threshold, latitude, longitude, cityName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .value { font-size: 48px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
        .links { margin: 30px 0; }
        .link-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 10px 10px 0; }
        .link-button:hover { background: #5568d3; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌌 Aurora Alert!</h1>
        </div>
        <div class="content">
          <div class="alert-box">
            <strong>Aurora activity has reached your alert threshold!</strong>
          </div>
          
          <div class="value">${auroraValue}/9</div>
          
          <p>Current aurora probability at your selected location:</p>
          <ul>
            <li><strong>Location:</strong> ${cityName}</li>
            <li><strong>Coordinates:</strong> ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°</li>
            <li><strong>Your Threshold:</strong> ${threshold}/9</li>
            <li><strong>Current Value:</strong> ${auroraValue}/9</li>
          </ul>
          
          <div class="links">
            <a href="${AURORA_IMAGE_URL}" class="link-button" target="_blank">View Latest Aurora Image</a>
            <a href="${AURORA_FORECAST_URL}" class="link-button" target="_blank">View Full Forecast</a>
          </div>
          
          <p>This is an automated alert from Aurora Alerter. Conditions may change, so check the forecast links above for the most current information.</p>
        </div>
        <div class="footer">
          <p>Aurora Alerter - Automated Aurora Forecast Monitoring</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Build plain text email content
 */
function buildEmailText(auroraValue, threshold, latitude, longitude, cityName) {
  return `
Aurora Alert!

Aurora activity has reached your alert threshold!

Current Value: ${auroraValue}/9
Your Threshold: ${threshold}/9

Location:
- City: ${cityName}
- Coordinates: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°

Links:
- Latest Aurora Image: ${AURORA_IMAGE_URL}
- Full Forecast: ${AURORA_FORECAST_URL}

This is an automated alert from Aurora Alerter. Conditions may change, so check the forecast links above for the most current information.
  `.trim();
}

