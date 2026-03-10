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

  async sendNewTicketNotification(to: string, subject: string, ticketId: string, fromCompany: string): Promise<void> {
    this.logger.log(
      `[EMAIL] New ticket notification to ${to}: [#${ticketId}] "${subject}" from ${fromCompany}`,
    );
    // TODO: Replace with actual email sending (nodemailer/SendGrid/SES)
    // await this.transporter.sendMail({
    //   from: this.fromEmail,
    //   to,
    //   subject: `[Novo Chamado] ${subject}`,
    //   html: `<p>Nova solicitação de suporte de <strong>${fromCompany}</strong>.</p>
    //          <p><strong>Assunto:</strong> ${subject}</p>
    //          <p><a href="${this.frontendUrl}/app/support/admin/tickets/${ticketId}">Ver chamado</a></p>`,
    // });
  }

  async sendPasswordResetEmail(email: string, token: string, locale = 'pt'): Promise<void> {
    const resetUrl = `${this.frontendUrl}/${locale}/reset-password?token=${token}`;
    this.logger.log(`[EMAIL] Password reset to ${email}: ${resetUrl}`);
    // TODO: Replace with actual email sending
    // await this.transporter.sendMail({
    //   from: this.fromEmail,
    //   to: email,
    //   subject: 'Redefinição de senha - FlexCatalog',
    //   html: `<p>Clique <a href="${resetUrl}">aqui</a> para redefinir sua senha. O link expira em 1 hora.</p>`,
    // });
  }

  async sendTicketReplyNotification(to: string, subject: string, ticketId: string, locale = 'pt'): Promise<void> {
    const ticketUrl = `${this.frontendUrl}/${locale}/app/support/tickets/${ticketId}`;
    this.logger.log(
      `[EMAIL] Ticket reply notification to ${to}: [#${ticketId}] "${subject}" - ${ticketUrl}`,
    );
    // TODO: Replace with actual email sending
    // await this.transporter.sendMail({
    //   from: this.fromEmail,
    //   to,
    //   subject: `[Resposta] ${subject}`,
    //   html: `<p>Seu chamado recebeu uma resposta.</p>
    //          <p><a href="${ticketUrl}">Ver chamado</a></p>`,
    // });
  }
}
