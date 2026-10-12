import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
import nodemailer from 'nodemailer';

console.log('Testing SMTP connection with:', process.env.GMAIL_USER);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const mailOptions = {
  from: `"JSPM BSIOTR AI Code Validator" <${process.env.GMAIL_USER}>`,
  to: process.env.GMAIL_USER,
  subject: '🎉 Real Email Verification is Active! - JSPM BSIOTR',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #4f46e5; margin: 0;">JSPM BSIOTR Wagholi, Pune</h2>
      <p style="color: #64748b; font-size: 13px;">AI-Based Code Validation Platform 2.0</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p style="color: #334155; font-size: 14px;">Your Gmail OTP integration has been successfully configured and verified.</p>
      <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; font-family: monospace; text-align: center; padding: 12px 0;">
        829104
      </div>
      <p style="color: #10b981; font-weight: bold; font-size: 13px; text-align: center;">✓ Real Delivery Confirmed</p>
    </div>
  `
};

try {
  const info = await transporter.sendMail(mailOptions);
  console.log('\n========================================================');
  console.log('✅ SUCCESS! Live email sent to:', process.env.GMAIL_USER);
  console.log('📧 Message ID:', info.messageId);
  console.log('========================================================\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ SMTP SEND ERROR:', err);
  process.exit(1);
}
