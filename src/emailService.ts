import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (email: string, token: string) => {
// FRONTEND_URL environment variable:
//   - Production: https://your-netlify-site.netlify.app (set on Heroku)
//   - Development fallback: http://localhost:3000
// For deploy:
// - Backend (Heroku): Set FRONTEND_URL to Netlify site URL
// - Frontend (Netlify): Already uses prod backend URL in EmailVerification.tsx
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?token=${token}`;
  console.log(`Verification URL for ${email}: ${verificationUrl}`);
  const html = `<p>Click <a href="${verificationUrl}">here</a> to verify your account.</p>`;
  if (!process.env.EMAIL_USER) {
    console.log('DEV MODE - No SMTP credentials. Simulated send:');
    console.log('To:', email);
    console.log('Subject: Verify Your Email - Personal Finance Tracker');
    console.log('HTML:', html);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - Personal Finance Tracker',
      html,
    });
    console.log(`Verification email sent successfully to ${email}`);
  } catch (error) {
    console.error(`Failed to send verification email to ${email}:`, error);
    throw error;
  }
};

export const sendInvitationEmail = async (email: string, groupName: string, inviterName: string) => {
  const subject = `Invitation to join ${groupName} on Personal Finance Tracker`;
  const html = `
    <p>Hello,</p>
    <p>${inviterName} has invited you to join the group "${groupName}" on Personal Finance Tracker.</p>
    <p>If you have an account, please log in and check your invitations.</p>
    <p>If you don't have an account, please register first.</p>
    <p>This is an automated invitation from your Personal Finance Tracker.</p>
  `;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html,
  });
};

export const sendMonthlyReport = async (
  email: string,
  month: number,
  year: number,
  totalSpent: number,
  categoryData: Array<{ category: string; spent: number; budget: number; status: string }>,
  anomalies: Array<{ id: number; explanation: string }>
) => {
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  const subject = `Monthly Financial Report - ${monthName} ${year}`;

  let html = `
    <h2>Monthly Financial Report - ${monthName} ${year}</h2>
    <h3>Summary</h3>
    <p><strong>Total Spent:</strong> $${totalSpent.toFixed(2)}</p>
    <h3>Category Breakdown</h3>
    <ul>
  `;

  categoryData.forEach(cat => {
    const color = cat.status === 'over' ? 'red' : 'green';
    html += `<li style="color: ${color};">${cat.category}: $${cat.spent.toFixed(2)} / $${cat.budget.toFixed(2)} (${cat.status})</li>`;
  });

  html += `</ul>`;

  if (anomalies.length > 0) {
    html += `<h3>Anomalies Detected</h3><ul>`;
    anomalies.forEach(anomaly => {
      html += `<li>Expense ID ${anomaly.id}: ${anomaly.explanation}</li>`;
    });
    html += `</ul>`;
  }

  html += `<p>This is an automated monthly report from your Personal Finance Tracker.</p>`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html,
  });
};

export const sendFeedbackEmail = async (
  userEmail: string,
  userName: string,
  subject: string,
  message: string,
  type: string,
  rating: number,
  category: string,
  attachments: string[],
  priority: boolean
) => {
  const adminEmail = 'muppetalert1@protonmail.com'; // Your admin email
  const feedbackSubject = `New Feedback: ${subject || 'No Subject'} [${type}]`;

  let html = `
    <h2>New User Feedback Received</h2>
    <h3>User Details</h3>
    <p><strong>Name:</strong> ${userName}</p>
    <p><strong>Email:</strong> ${userEmail}</p>
    <p><strong>Rating:</strong> ${rating}/5</p>
    <p><strong>Category:</strong> ${category}</p>
    <p><strong>Type:</strong> ${type}</p>
    ${priority ? '<p><strong>⭐ PRIORITY FEEDBACK</strong></p>' : ''}

    <h3>Message</h3>
    <p>${message.replace(/\n/g, '<br>')}</p>
  `;

  if (attachments && attachments.length > 0) {
    html += `<h3>Attachments</h3><ul>`;
    attachments.forEach(attachment => {
      html += `<li>${attachment.split('/').pop()}</li>`;
    });
    html += `</ul>`;
  }

  html += `<p><em>This feedback was submitted via your Personal Finance Tracker application.</em></p>`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: feedbackSubject,
    html,
  });
};