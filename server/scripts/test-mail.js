#!/usr/bin/env node

/**
 * CLI Test Script for Outbound SMTP Email Delivery
 *
 * Usage:
 *   npm run mail:test -- recipient@example.com
 *   node scripts/test-mail.js recipient@example.com
 */

import config from '../src/config/index.js';
import mailService from '../src/services/mail.service.js';

const recipient = process.argv[2]?.trim();

console.log('\n==================================================');
console.log('📬 NestMate — Outbound SMTP Test Runner');
console.log('==================================================');

if (!recipient) {
  console.error('\n❌ Error: Recipient email address is required.');
  console.log('\nUsage:');
  console.log('  npm run mail:test -- <recipient-email>');
  console.log('\nExample:');
  console.log('  npm run mail:test -- yourname@gmail.com\n');
  process.exit(1);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(recipient)) {
  console.error(`\n❌ Error: "${recipient}" is not a valid email address.\n`);
  process.exit(1);
}

console.log(`• Target Recipient : ${recipient}`);
console.log(`• SMTP Host        : ${config.smtp.host || '(empty - mock mode)'}`);
console.log(`• SMTP Port        : ${config.smtp.port}`);
console.log(`• SMTP User        : ${config.smtp.user || '(not configured)'}`);
console.log(`• Outbound Sender  : ${config.smtp.mailFrom}`);
console.log('--------------------------------------------------');

async function runTest() {
  if (!config.smtp.host) {
    console.warn('\n⚠️  Notice: SMTP_HOST is not configured in server/.env.');
    console.warn('   The mail service is operating in mock mode (logs to console only).');
    console.warn('   To test real SMTP delivery, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in server/.env.\n');
  } else {
    console.log('\n🔄 Verifying SMTP server connection & credentials...');
    const verification = await mailService.verifyConnection();

    if (!verification.connected) {
      console.error('\n❌ SMTP verification failed. Cannot proceed with sending email.');
      console.error(`   Error details: ${verification.error || 'Connection failed'}\n`);
      process.exit(1);
    }
  }

  console.log(`\n📤 Sending test message to ${recipient}...`);

  const now = new Date();
  const formattedTime = now.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const subject = 'NestMate — SMTP Verification & Delivery Test';

  const text = `Hello from NestMate!

This is a test message to verify that your SMTP email delivery configuration is working correctly.

Details:
• Delivery Time : ${formattedTime}
• SMTP Host     : ${config.smtp.host || 'mock'}
• SMTP Port     : ${config.smtp.port}
• Sender Address: ${config.smtp.mailFrom}

If you received this message, your email integration is fully operational and ready to send verification OTPs and student notifications!

Warm regards,
The NestMate Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; border: 1px solid #EADFCF; border-radius: 14px; background-color: #FFFFFF; color: #3D2C24;">
      <div style="border-bottom: 2px solid #F4B393; padding-bottom: 14px; margin-bottom: 20px;">
        <h1 style="color: #3D2C24; font-size: 22px; margin: 0; font-weight: 800;">NestMate</h1>
        <p style="color: #7A6458; font-size: 13px; margin: 4px 0 0 0;">Outbound SMTP Service Verification</p>
      </div>

      <p style="font-size: 15px; line-height: 1.5; color: #3D2C24;">Hello!</p>
      <p style="font-size: 14px; line-height: 1.6; color: #7A6458;">
        This test message confirms that your SMTP email service is configured correctly and able to dispatch emails to students.
      </p>

      <div style="background-color: #FBF5EC; border: 1px solid #EADFCF; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px;">
        <div style="margin-bottom: 6px;"><strong style="color: #3D2C24;">Target Recipient:</strong> <span style="color: #AC5429;">${recipient}</span></div>
        <div style="margin-bottom: 6px;"><strong style="color: #3D2C24;">Timestamp:</strong> ${formattedTime}</div>
        <div style="margin-bottom: 6px;"><strong style="color: #3D2C24;">SMTP Server:</strong> ${config.smtp.host || 'mock'} (${config.smtp.port})</div>
        <div><strong style="color: #3D2C24;">Sender Header:</strong> ${config.smtp.mailFrom}</div>
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #5E9C76; font-weight: 600;">
        ✓ Your SMTP service is healthy and ready to dispatch OTP registration codes and roommate notifications.
      </p>

      <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #EADFCF; font-size: 12px; color: #7A6458;">
        NestMate Student Housing Platform • Automated Test Dispatch
      </div>
    </div>
  `;

  try {
    const result = await mailService.sendMail({
      to: recipient,
      subject,
      text,
      html,
    });

    console.log('\n==================================================');
    console.log('🎉 SUCCESS: Test email dispatched successfully!');
    console.log(`• Message ID : ${result.messageId}`);
    if (result.mocked) {
      console.log('• Mode       : Mock / Console Log (no network request sent)');
    } else {
      console.log('• Mode       : Live SMTP Delivery');
      console.log('• Next Step  : Check your inbox (and Spam/Junk folder if delayed).');
    }
    console.log('==================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n==================================================');
    console.error('❌ FAILED: Unable to deliver test email.');
    console.error(`• Reason [${error.type || 'ERROR'}]: ${error.message}`);
    console.error('==================================================\n');
    process.exit(1);
  }
}

runTest();
