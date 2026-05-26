/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Centralized email service using Resend.com
 */
const axios = require('axios');

async function sendVerificationEmail(email, name, token, hostUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  const verificationLink = `${hostUrl}/api/auth/verify-email?token=${token}`;

  console.log(`✉️ Generating verification email for ${email}`);
  console.log(`🔗 Verification Link: ${verificationLink}`);

  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY is not defined in environment variables. Email sending skipped.');
    return { success: false, reason: 'missing_api_key', link: verificationLink };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your GeneLab Account</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #1e293b;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          border: 1px solid #334155;
        }
        .header {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #f1f5f9;
        }
        .text {
          color: #94a3b8;
          font-size: 16px;
          margin-bottom: 30px;
        }
        .btn-container {
          text-align: center;
          margin: 35px 0;
        }
        .btn {
          background-color: #6366f1;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 30px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          display: inline-block;
          transition: background-color 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2), 0 2px 4px -2px rgba(99, 102, 241, 0.2);
        }
        .btn:hover {
          background-color: #4f46e5;
        }
        .footer {
          background-color: #0f172a;
          padding: 24px;
          text-align: center;
          font-size: 13px;
          color: #64748b;
          border-top: 1px solid #334155;
        }
        .footer a {
          color: #94a3b8;
          text-decoration: underline;
        }
        .divider {
          height: 1px;
          background-color: #334155;
          margin: 24px 0;
        }
        .link-text {
          font-size: 12px;
          word-break: break-all;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧬 GeneLab AI</h1>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name},</div>
          <div class="text">
            Thank you for registering at GeneLab AI. To finalize your account setup and gain access to the clinical genomics analysis portal, please verify your email address.
          </div>
          <div class="btn-container">
            <a href="${verificationLink}" class="btn">Verify Email Address</a>
          </div>
          <div class="text">
            This verification link will expire in 24 hours. If you did not sign up for a GeneLab account, please ignore this email.
          </div>
          <div class="divider"></div>
          <div class="link-text">
            If you're having trouble clicking the button, copy and paste the URL below into your web browser:<br>
            <a href="${verificationLink}" style="color: #6366f1;">${verificationLink}</a>
          </div>
        </div>
        <div class="footer">
          &copy; 2026 GeneLab AI. All rights reserved.<br>
          Advanced AI Genomics & Bioinformatic Sequencing Portal.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from: process.env.EMAIL_FROM || 'GeneLab AI <onboarding@resend.dev>',
        to: [email],
        subject: '🧬 Verify Your GeneLab AI Account',
        html: htmlContent,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Verification email sent successfully through Resend:', response.data);
    return { success: true, data: response.data };
  } catch (err) {
    const errorDetails = err.response ? err.response.data : err.message;
    console.error('❌ Failed to send verification email via Resend:', errorDetails);
    return { success: false, error: errorDetails };
  }
}

module.exports = { sendVerificationEmail };
