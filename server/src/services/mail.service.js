import nodemailer from 'nodemailer';
import config from '../config/index.js';

class MailService {
  constructor() {
    this.transporter = null;
    this.lastSentMail = null;
    this.initTransporter();
  }

  initTransporter() {
    // If in production and SMTP host is specified, initialize real transporter
    if (config.nodeEnv === 'production' && config.smtp.host) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: config.smtp.user
          ? {
              user: config.smtp.user,
              pass: config.smtp.pass,
            }
          : undefined,
      });
    }
  }

  async sendMail({ to, subject, text, html, otp }) {
    this.lastSentMail = { to, subject, text, html, otp, sentAt: new Date() };

    // In development, test, or when real SMTP is not configured, log to console
    const isDevOrTest = config.nodeEnv === 'development' || config.nodeEnv === 'test';
    const isSmtpMissing = !config.smtp.host || config.smtp.host === 'localhost';

    if (isDevOrTest || isSmtpMissing || !this.transporter) {
      console.log('\n==================================================');
      console.log('[EMAIL SERVICE - DEV LOG]');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      if (otp) {
        console.log(`OTP Code: ${otp}`);
      }
      console.log(`Body: ${text}`);
      console.log('==================================================\n');

      return {
        success: true,
        mocked: true,
        messageId: `dev-mock-${Date.now()}`,
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: config.smtp.mailFrom || 'noreply@roomiematch.edu',
        to,
        subject,
        text,
        html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Failed to send email via SMTP:', error);
      throw error;
    }
  }

  async sendOtpEmail({ to, otp, type = 'registration' }) {
    const subject =
      type === 'password_reset'
        ? 'RoomieMatch — Password Reset Code'
        : 'RoomieMatch — Verify Your Student Email';

    const text = `Welcome to RoomieMatch!

Your 6-digit verification code is: ${otp}

This code will expire in 10 minutes. Please enter this code to complete your ${
      type === 'password_reset' ? 'password reset' : 'registration'
    }.

If you did not request this, please disregard this email.`;

    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-top: 0;">RoomieMatch Verification</h2>
        <p>Your one-time verification code is:</p>
        <div style="background-color: #f1f5f9; padding: 16px; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; border-radius: 6px; color: #1e293b;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
          This code is valid for 10 minutes and can be used only once.
        </p>
      </div>
    `;

    return this.sendMail({
      to,
      subject,
      text,
      html,
      otp,
    });
  }

  getLastSentMail() {
    return this.lastSentMail;
  }
}

export const mailService = new MailService();
export default mailService;
