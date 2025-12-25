/**
 * Email notification service using Brevo (formerly Sendinblue)
 */

import brevo from '@getbrevo/brevo';

// Initialize Brevo API client
let brevoClient = null;

function getBrevoClient() {
  if (!brevoClient) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  WARNING: BREVO_API_KEY is not set in environment variables');
      console.warn('   Email sending will fail. Please add BREVO_API_KEY to your .env file');
    }
    
    // Configure Brevo API client
    const defaultClient = brevo.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];
    apiKeyAuth.apiKey = apiKey || '';
    
    brevoClient = new brevo.TransactionalEmailsApi();
  }
  return brevoClient;
}

// Aurora forecast links
const AURORA_IMAGE_URL = 'https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg';
const AURORA_FORECAST_URL = 'https://www.swpc.noaa.gov/products/aurora-30-minute-forecast';

// Get frontend URL for email links
function getFrontendUrl() {
  // In production, use the configured frontend domain
  if (process.env.NODE_ENV === 'production') {
    return process.env.FRONTEND_URL || 'https://aurora.icurety.com';
  }
  // In development, use localhost
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

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
  
  // Create link to overview page with auto-login
  const frontendUrl = getFrontendUrl();
  const overviewUrl = `${frontendUrl}?email=${encodeURIComponent(toEmail)}`;

  // Get sender email from environment (or use a default)
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@example.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Aurora Alerter';

  // Check if API key is configured (read it now, after dotenv has loaded)
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    const error = new Error('Brevo API key is not configured. Please set BREVO_API_KEY in your .env file');
    console.error(`Error sending email to ${toEmail}:`, error.message);
    throw error;
  }

  // Get Brevo client (lazy initialization)
  const client = getBrevoClient();

  try {
    // Create email object
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `🌌 Aurora Alert: ${cityName} Level ${auroraValue} Detected!`;
    sendSmtpEmail.htmlContent = buildEmailHtml(auroraValue, threshold, latitude, longitude, cityName, overviewUrl);
    sendSmtpEmail.textContent = buildEmailText(auroraValue, threshold, latitude, longitude, cityName, overviewUrl);
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: toEmail }];
    sendSmtpEmail.replyTo = { email: senderEmail, name: senderName };

    // Send email using Brevo API
    const response = await client.sendTransacEmail(sendSmtpEmail);
    console.log(`Email sent successfully to ${toEmail}:`, response.messageId || 'Success');
    return { success: true, response };
  } catch (error) {
    // Provide more detailed error information
    if (error.response) {
      console.error(`❌ Brevo API error:`, error.response.body || error.response.text);
    } else if (error.message && (error.message.includes('Unauthorized') || error.message.includes('Invalid'))) {
      console.error(`❌ Brevo authentication failed. Please check:`);
      console.error(`   1. BREVO_API_KEY is set in your .env file`);
      console.error(`   2. The API key is valid and has email sending permissions`);
      console.error(`   3. Your sender email is verified in Brevo`);
      console.error(`   4. You've restarted the server after adding the API key`);
    }
    console.error(`Error sending email to ${toEmail}:`, error.message || error);
    throw error;
  }
}

/**
 * Build HTML email content
 */
function buildEmailHtml(auroraValue, threshold, latitude, longitude, cityName, overviewUrl) {
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
        .link-button-primary { background: #28a745; font-weight: 600; }
        .link-button-primary:hover { background: #218838; }
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
          
          <div class="value">${auroraValue}/100</div>
          
          <p>Current aurora probability at your selected location:</p>
          <ul>
            <li><strong>Location:</strong> ${cityName}</li>
            <li><strong>Coordinates:</strong> ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°</li>
            <li><strong>Your Threshold:</strong> ${threshold}/100</li>
            <li><strong>Current Value:</strong> ${auroraValue}/100</li>
          </ul>
          
          <div class="links">
            <a href="${overviewUrl}" class="link-button link-button-primary" target="_blank">View My Alerts</a>
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
function buildEmailText(auroraValue, threshold, latitude, longitude, cityName, overviewUrl) {
  return `
Aurora Alert!

Aurora activity has reached your alert threshold!

Current Value: ${auroraValue}/100
Your Threshold: ${threshold}/100

Location:
- City: ${cityName}
- Coordinates: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°

Links:
- View My Alerts: ${overviewUrl}
- Latest Aurora Image: ${AURORA_IMAGE_URL}
- Full Forecast: ${AURORA_FORECAST_URL}

This is an automated alert from Aurora Alerter. Conditions may change, so check the forecast links above for the most current information.
  `.trim();
}

