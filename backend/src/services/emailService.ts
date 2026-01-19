import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `Fantasy IPL <${process.env.GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export async function sendTeamsPdf(
  emails: string[],
  pdfBuffer: Buffer,
  gameName: string
): Promise<{ success: string[]; failed: string[] }> {
  const results = { success: [] as string[], failed: [] as string[] };

  for (const email of emails) {
    const success = await sendEmail({
      to: email,
      subject: `${gameName} - Auction Complete`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Fantasy IPL - ${gameName}</h2>
          <p>The auction has ended! Please find attached the complete team summary PDF.</p>
          <p>Good luck with your team!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This email was sent from the Fantasy IPL application.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `${gameName.replace(/[^a-zA-Z0-9]/g, '_')}_teams.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (success) {
      results.success.push(email);
    } else {
      results.failed.push(email);
    }
  }

  return results;
}

export async function sendGameInvite(
  email: string,
  gameName: string,
  gameCode: string,
  inviterName: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `You're invited to join ${gameName} - Fantasy IPL`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">You're Invited!</h2>
        <p>${inviterName} has invited you to join their Fantasy IPL game: <strong>${gameName}</strong></p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #6b7280;">Game Code:</p>
          <h1 style="margin: 10px 0; color: #1e40af; font-size: 32px; letter-spacing: 4px;">${gameCode}</h1>
        </div>
        <p>Use this code to join the game in the Fantasy IPL app.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          This email was sent from the Fantasy IPL application.
        </p>
      </div>
    `,
  });
}
