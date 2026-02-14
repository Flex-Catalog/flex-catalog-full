import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@flexcatalog.com';
  }

  async sendVerificationEmail(email: string, token: string, locale = 'en'): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/${locale}/verify-email?token=${token}`;

    // In production, integrate with nodemailer, SendGrid, SES, etc.
    // For now, log the verification link.
    this.logger.log(
      `[EMAIL] Verification email to ${email}: ${verifyUrl}`,
    );

    // TODO: Replace with actual email sending
    // Example with nodemailer:
    // await this.transporter.sendMail({
    //   from: this.fromEmail,
    //   to: email,
    //   subject: 'Verify your FlexCatalog account',
    //   html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
    // });
  }

  async sendAffiliateInvite(email: string, inviteToken: string, locale = 'en'): Promise<void> {
    const inviteUrl = `${this.frontendUrl}/${locale}/register?invite=${inviteToken}`;

    this.logger.log(
      `[EMAIL] Affiliate invite to ${email}: ${inviteUrl}`,
    );

    // TODO: Replace with actual email sending
  }
}
