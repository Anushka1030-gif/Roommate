import nodemailer from 'nodemailer';
import config from '../config/index.js';

class MailService {
  constructor() {
    this.transporter = null;
    this.lastSentMail = null;
    this.initTransporter();
  }

  initTransporter() {
    const host = config.smtp.host ? config.smtp.host.trim() : '';
    if (host) {
      const port = Number(config.smtp.port) || 587;
      const hasAuth = Boolean(config.smtp.user && config.smtp.pass);

      const transportOptions = {
        host,
        port,
        secure: port === 465, // true for 465, false for 587
        requireTLS: port === 587, // STARTTLS for port 587
        connectionTimeout: 10000, // 10s connection timeout
        greetingTimeout: 10000, // 10s greeting timeout
      };

      if (hasAuth) {
        transportOptions.auth = {
          user: config.smtp.user,
          pass: config.smtp.pass,
        };
      }

      this.transporter = nodemailer.createTransport(transportOptions);
    } else {
      this.transporter = null;
    }
  }

  setTransporter(transporter) {
    this.transporter = transporter;
  }

  categorizeSmtpError(error) {
    const code = error?.code || '';
    const msg = error?.message || '';
    const response = error?.response || '';
    const responseCode = error?.responseCode || 0;

    // Credentials / Authentication errors
    if (
      code === 'EAUTH' ||
      responseCode === 535 ||
      response.includes('535') ||
      msg.toLowerCase().includes('username and password not accepted') ||
      msg.toLowerCase().includes('badcredentials') ||
      msg.toLowerCase().includes('invalid credentials')
    ) {
      return {
        type: 'CREDENTIALS_ERROR',
        message:
          'Invalid SMTP credentials (username or App Password). If using Gmail, ensure 2-Step Verification is ON and you are using a generated 16-character App Password, not your regular Google password.',
      };
    }

    // Connection / Port / Host errors
    if (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      msg.toLowerCase().includes('getaddrinfo')
    ) {
      return {
        type: 'CONNECTION_ERROR',
        message: `Unable to connect to SMTP server at ${config.smtp.host}:${config.smtp.port} (${code || 'Connection failed'}). Check hostname, port, and network connection.`,
      };
    }

    // TLS / SSL negotiation errors
    if (
      code.includes('TLS') ||
      msg.toLowerCase().includes('tls') ||
      msg.toLowerCase().includes('ssl') ||
      code === 'ESOCKET' ||
      msg.toLowerCase().includes('handshake')
    ) {
      return {
        type: 'TLS_ERROR',
        message: `TLS/SSL handshake failed with ${config.smtp.host}:${config.smtp.port}. For port 587, STARTTLS (secure: false, requireTLS: true) is required.`,
      };
    }

    return {
      type: 'SMTP_ERROR',
      message: msg || 'Unknown SMTP error occurred',
    };
  }

  async verifyConnection() {
    const host = config.smtp.host ? config.smtp.host.trim() : '';
    if (!host) {
      console.log('ℹ️  SMTP_HOST is empty. Mail service running in mock mode (emails will log to console).');
      return { connected: false, mocked: true };
    }

    if (!this.transporter) {
      this.initTransporter();
    }

    if (!this.transporter) {
      console.warn('⚠️  SMTP transporter could not be initialized.');
      return { connected: false, error: 'Transporter not initialized' };
    }

    try {
      await this.transporter.verify();
      const userDisplay = config.smtp.user ? config.smtp.user : '(none)';
      console.log(`✅ SMTP connection verified successfully (${host}:${config.smtp.port}, user: ${userDisplay})`);
      return { connected: true };
    } catch (error) {
      const categorized = this.categorizeSmtpError(error);
      console.error(`❌ SMTP connection verification failed for ${host}:${config.smtp.port}`);
      console.error(`   Reason [${categorized.type}]: ${categorized.message}`);
      return { connected: false, error: categorized.message, type: categorized.type };
    }
  }

  async sendMail({ to, subject, text, html, otp }) {
    this.lastSentMail = { to, subject, text, html, otp, sentAt: new Date() };

    const host = config.smtp.host ? config.smtp.host.trim() : '';

    // If SMTP_HOST is empty, fall back to console logging
    if (!host || !this.transporter) {
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
        from: config.smtp.mailFrom || 'NestMate <noreply@roomiematch.edu>',
        to,
        subject,
        text,
        html,
      });

      console.log(`📧 Email sent successfully to ${to} (Message ID: ${info.messageId})`);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const categorized = this.categorizeSmtpError(error);
      console.error(`❌ Failed to send email to ${to}: [${categorized.type}] ${categorized.message}`);
      const deliveryError = new Error(categorized.message);
      deliveryError.type = categorized.type;
      deliveryError.originalError = error;
      throw deliveryError;
    }
  }

  async sendOtpEmail({ to, otp, type = 'registration' }) {
    const subject =
      type === 'password_reset'
        ? 'NestMate — Password Reset Code'
        : 'NestMate — Verify Your Student Email';

    const text = `Welcome to NestMate!

Your 6-digit verification code is: ${otp}

This code will expire in 10 minutes. Please enter this code to complete your ${
      type === 'password_reset' ? 'password reset' : 'registration'
    }.

If you did not request this, please disregard this email.`;

    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #EADFCF; border-radius: 12px; background-color: #FFFFFF;">
        <h2 style="color: #3D2C24; margin-top: 0;">NestMate Verification</h2>
        <p style="color: #7A6458;">Your one-time verification code is:</p>
        <div style="background-color: #F3E9DA; padding: 16px; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; border-radius: 8px; color: #3D2C24; border: 1px solid #EADFCF;">
          ${otp}
        </div>
        <p style="color: #7A6458; font-size: 14px; margin-top: 20px;">
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

  async sendMessageNotificationEmail({ to, recipientName, senderName, conversationId, messageSnippet }) {
    const oneHourMs = 60 * 60 * 1000;
    if (!this.conversationEmailTimestamps) {
      this.conversationEmailTimestamps = new Map();
    }
    const lastSent = this.conversationEmailTimestamps.get(conversationId);
    const now = Date.now();

    if (lastSent && now - lastSent < oneHourMs) {
      return { skipped: true, reason: 'rate_limited_one_hour' };
    }

    this.conversationEmailTimestamps.set(conversationId, now);

    const subject = `NestMate — New message from ${senderName}`;
    const text = `Hi ${recipientName},\n\nYou have received a new message from ${senderName} on NestMate:\n\n"${messageSnippet.slice(0, 100)}${messageSnippet.length > 100 ? '...' : ''}"\n\nLog in to your NestMate account to reply in real time:\n${config.clientUrl}/chats\n\nBest,\nThe NestMate Team`;

    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #EADFCF; border-radius: 12px; background-color: #FFFFFF;">
        <h3 style="color: #AC5429; margin-top: 0;">New Message on NestMate</h3>
        <p style="color: #3D2C24;">Hi ${recipientName},</p>
        <p style="color: #7A6458;"><strong>${senderName}</strong> sent you a message:</p>
        <blockquote style="background-color: #FBF5EC; border-left: 4px solid #D9825B; padding: 12px 16px; margin: 16px 0; color: #3D2C24; font-style: italic;">
          "${messageSnippet.slice(0, 100)}${messageSnippet.length > 100 ? '...' : ''}"
        </blockquote>
        <div style="margin: 24px 0;">
          <a href="${config.clientUrl}/chats" style="background-color: #AC5429; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Open Chat & Reply
          </a>
        </div>
        <p style="color: #7A6458; font-size: 12px; margin-top: 24px;">
          Note: Email notifications are limited to at most one per hour per conversation to keep your inbox tidy.
        </p>
      </div>
    `;

    return this.sendMail({
      to,
      subject,
      text,
      html,
    });
  }

  async sendWarningEmail({ to, recipientName = 'Roommate', note }) {
    const subject = 'NestMate — Account Notice & Community Guidelines';
    const text = `Hi ${recipientName},\n\nOur safety moderation team reviewed a report regarding your activity on NestMate.\n\nNotice from moderator:\n"${note || 'Please adhere to our community guidelines.'}"\n\nPlease ensure your interactions and profile remain respectful, truthful, and supportive of the student community.\n\nBest,\nThe NestMate Safety Team`;

    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #D9A441; border-radius: 12px; background-color: #FBF5EC;">
        <h3 style="color: #6B4B10; margin-top: 0;">Community Guidelines Notice</h3>
        <p style="color: #3D2C24;">Hi ${recipientName},</p>
        <p style="color: #7A6458;">Our safety moderation team reviewed a report regarding your activity on NestMate.</p>
        <blockquote style="background-color: #F3E9DA; border-left: 4px solid #D9A441; padding: 12px 16px; margin: 16px 0; color: #6B4B10;">
          "${note || 'Please adhere to our student community standards and guidelines.'}"
        </blockquote>
        <p style="color: #7A6458; font-size: 13px;">
          Please ensure your interactions, roommate preferences, and chat messages remain respectful, safe, and transparent.
        </p>
        <p style="color: #7A6458; font-size: 12px; margin-top: 24px;">
          If you have questions regarding this notice, reply to support@roomiematch.edu.
        </p>
      </div>
    `;

    return this.sendMail({
      to,
      subject,
      text,
      html,
    });
  }

  getLastSentMail() {
    return this.lastSentMail;
  }
}

export const mailService = new MailService();
export default mailService;
