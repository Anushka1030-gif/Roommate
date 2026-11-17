import { describe, it, expect, vi, beforeEach } from 'vitest';
import config from '../config/index.js';
import mailService from './mail.service.js';

describe('MailService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mock Mode (SMTP_HOST is empty)', () => {
    it('runs in mock mode when SMTP_HOST is empty and logs to console without network request', async () => {
      config.smtp.host = '';
      mailService.initTransporter();

      const verifyRes = await mailService.verifyConnection();
      expect(verifyRes.mocked).toBe(true);
      expect(verifyRes.connected).toBe(false);

      const sendRes = await mailService.sendMail({
        to: 'student@example.com',
        subject: 'Test Subject',
        text: 'Test Body',
        otp: '123456',
      });

      expect(sendRes.success).toBe(true);
      expect(sendRes.mocked).toBe(true);
      expect(sendRes.messageId).toContain('dev-mock');
      expect(mailService.getLastSentMail().otp).toBe('123456');
    });
  });

  describe('Error Categorization', () => {
    it('categorizes credentials and authentication failures (EAUTH / 535)', () => {
      const authErr = new Error('Invalid login: 535-5.7.8 Username and Password not accepted');
      authErr.code = 'EAUTH';
      authErr.response = '535-5.7.8 Username and Password not accepted';

      const categorized = mailService.categorizeSmtpError(authErr);
      expect(categorized.type).toBe('CREDENTIALS_ERROR');
      expect(categorized.message).toContain('App Password');
    });

    it('categorizes connection and host failures (ECONNREFUSED / ENOTFOUND / ETIMEDOUT)', () => {
      const connErr = new Error('connect ECONNREFUSED 127.0.0.1:587');
      connErr.code = 'ECONNREFUSED';

      const categorized = mailService.categorizeSmtpError(connErr);
      expect(categorized.type).toBe('CONNECTION_ERROR');
      expect(categorized.message).toContain('Unable to connect to SMTP server');
    });

    it('categorizes TLS and handshake failures', () => {
      const tlsErr = new Error('Greeting failed: TLS handshake error');
      tlsErr.code = 'ETLS';

      const categorized = mailService.categorizeSmtpError(tlsErr);
      expect(categorized.type).toBe('TLS_ERROR');
      expect(categorized.message).toContain('STARTTLS');
    });
  });

  describe('Live SMTP Delivery with Transporter', () => {
    it('verifies connection successfully when transporter.verify resolves', async () => {
      config.smtp.host = 'smtp.gmail.com';
      config.smtp.port = 587;
      config.smtp.user = 'user@gmail.com';
      config.smtp.pass = 'app-pass';

      const mockTransporter = {
        verify: vi.fn().mockResolvedValue(true),
        sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-abc-123' }),
      };

      mailService.setTransporter(mockTransporter);

      const res = await mailService.verifyConnection();
      expect(res.connected).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();

      // Reset
      config.smtp.host = '';
      mailService.initTransporter();
    });

    it('returns helpful error when transporter.verify rejects with credentials error', async () => {
      config.smtp.host = 'smtp.gmail.com';
      config.smtp.port = 587;
      config.smtp.user = 'user@gmail.com';

      const mockTransporter = {
        verify: vi.fn().mockRejectedValue({
          code: 'EAUTH',
          message: 'Username and Password not accepted',
        }),
      };

      mailService.setTransporter(mockTransporter);

      const res = await mailService.verifyConnection();
      expect(res.connected).toBe(false);
      expect(res.type).toBe('CREDENTIALS_ERROR');
      expect(res.error).toContain('App Password');

      // Reset
      config.smtp.host = '';
      mailService.initTransporter();
    });

    it('successfully sends email and returns messageId via transporter', async () => {
      config.smtp.host = 'smtp.gmail.com';
      config.smtp.port = 587;

      const mockTransporter = {
        sendMail: vi.fn().mockResolvedValue({ messageId: '<sent-msg-id-999@gmail.com>' }),
      };

      mailService.setTransporter(mockTransporter);

      const result = await mailService.sendOtpEmail({
        to: 'target@gmail.com',
        otp: '654321',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<sent-msg-id-999@gmail.com>');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'target@gmail.com',
          subject: expect.stringContaining('NestMate'),
          text: expect.stringContaining('654321'),
        })
      );

      // Reset
      config.smtp.host = '';
      mailService.initTransporter();
    });

    it('rethrows helpful categorized error when transporter.sendMail fails', async () => {
      config.smtp.host = 'smtp.gmail.com';

      const mockTransporter = {
        sendMail: vi.fn().mockRejectedValue({
          code: 'ECONNREFUSED',
          message: 'Connection refused',
        }),
      };

      mailService.setTransporter(mockTransporter);

      await expect(
        mailService.sendMail({
          to: 'fail@example.com',
          subject: 'Test',
          text: 'Hello',
        })
      ).rejects.toThrow('Unable to connect to SMTP server');

      // Reset
      config.smtp.host = '';
      mailService.initTransporter();
    });
  });
});
