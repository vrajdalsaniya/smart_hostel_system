import nodemailer from 'nodemailer';

const isProduction = () => process.env.NODE_ENV === 'production';

function smtpCredentials() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s/g, '');
  const host = (process.env.SMTP_HOST || '').trim();
  const from = (process.env.MAIL_FROM || '').trim() || (user ? `Smart Hostel <${user}>` : '');
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || (port === 465 ? 'true' : 'false')).toLowerCase() === 'true';
  return { host, port, secure, user, pass, from };
}

async function createTransport() {
  const smtp = smtpCredentials();
  if (smtp) {
    return {
      kind: 'smtp',
      from: smtp.from,
      transporter: nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass }
      })
    };
  }

  if (isProduction()) return null;

  const testAccount = await nodemailer.createTestAccount();
  return {
    kind: 'ethereal',
    from: `Smart Hostel <${testAccount.user}>`,
    transporter: nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass }
    })
  };
}

function message({ role, resetUrl }) {
  return {
    subject: 'Reset your Smart Hostel password',
    text: `A password reset was requested for your Smart Hostel ${role} account. Open this link within 30 minutes: ${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>A password reset was requested for your Smart Hostel <b>${role}</b> account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes and can be used once. If you did not request it, you can safely ignore this email.</p>`
  };
}

export async function sendPasswordResetEmail({ email, role, resetUrl }) {
  try {
    const transport = await createTransport();
    if (!transport) return { sent: false };

    const info = await transport.transporter.sendMail({
      from: transport.from,
      to: email,
      ...message({ role, resetUrl })
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || '';
    if (previewUrl) console.log(`Password reset email preview: ${previewUrl}`);
    else console.log(`Password reset email sent to ${email}`);

    return { sent: true, kind: transport.kind, previewUrl };
  } catch (error) {
    console.error('Password reset email failed:', error.message);
    return { sent: false, error: error.message };
  }
}
