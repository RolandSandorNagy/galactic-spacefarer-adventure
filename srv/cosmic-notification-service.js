import nodemailer from 'nodemailer';

const hasSmtpConfiguration =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASSWORD;

function createTransport() {
  if (hasSmtpConfiguration) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  // Local development and automated tests:
  // generates the complete email without delivering it externally.
  return nodemailer.createTransport({
    jsonTransport: true
  });
}

export class CosmicNotificationService {
  constructor(transport = createTransport()) {
    this.transport = transport;
  }

  async sendWelcomeEmail(spacefarer) {
    const message = {
      from:
        process.env.NOTIFICATION_FROM ??
        'Galactic Adventure <noreply@galactic-adventure.example>',
      to: spacefarer.email,
      subject: 'Welcome to your Galactic Spacefarer Adventure!',
      text: [
        `Dear ${spacefarer.firstName} ${spacefarer.lastName},`,
        '',
        'Congratulations! Your galactic adventure has officially begun.',
        `Your stardust collection status is ${spacefarer.stardustCollectionStatus},`,
        `and your wormhole navigation rank is ${spacefarer.navigationRank}.`,
        '',
        'Prepare your spacesuit and get ready to explore the SAP galaxy!',
        '',
        'Galactic Adventure Command'
      ].join('\n')
    };

    return this.transport.sendMail(message);
  }
}

export const cosmicNotificationService =
  new CosmicNotificationService();