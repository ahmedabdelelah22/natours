const { Resend } = require('resend');
const nodemailer = require('nodemailer'); // 🚀 Nodemailer handles sending emails
const pug = require('pug');               // 🎨 Pug templates for nice HTML emails
const { convert } = require('html-to-text'); // 📝 Convert HTML to plain text for old email clients
require('dotenv').config();               // 🔒 Load environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

// 💌 This Email class is your all-in-one email superhero
class Email {
  constructor(user, url) {
    this.to = user.email;                            // 📩 Recipient's email
    this.firstName = user.name.split(' ')[0];       // 😎 We like to be personal – first name only
    this.url = url;                                 // 🌐 Link for password reset, welcome page, etc.
    this.from = `App <${process.env.EMAIL_FROM}>`;  // ✉️ Sender info from env variables
  }

  // 🛠️ Create a transporter depending on environment
  // newTransport() {
  //   if (process.env.NODE_ENV === 'production') {
  //     // 🌟 In production, use real provider like SendGrid, Mailgun, etc.
  //     return nodemailer.createTransport({
  //       host: 'smtp.sendgrid.net', // 📨 Example: SendGrid SMTP
  //       port: 587,
  //       auth: {
  //         user: process.env.SENDGRID_USERNAME,
  //         pass: process.env.SENDGRID_PASSWORD,
  //       },
  //     });
  //   }

  //   // 🧪 In development, Gmail works just fine
  //   return nodemailer.createTransport({
  //      host: 'smtp.gmail.com',
  //   port: 587,
  //   secure: false,
  //   auth: {
  //     user: process.env.EMAIL_USERNAME,
  //     pass: process.env.EMAIL_PASSWORD,
  //   },
  //   tls: {
  //     rejectUnauthorized: false
  //   }
  //   });
  // }

  // ✨ Generic method to send any type of email
  async send(template, subject) {
    // 1️⃣ Render HTML using Pug template – pretty and dynamic
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      { firstName: this.firstName, url: this.url, subject }
    );

    // // 2️⃣ Set up mail options – what goes into the email
    // const mailOptions = {
    //   from: this.from,
    //   to: this.to,
    //   subject,
    //   html,                           // 💖 Fancy HTML version
    //   text: convert(html), // 📝 Plain text fallback
    // };

    // // 3️⃣ Send the email – magic happens here ✨
    // await this.newTransport().sendMail(mailOptions);
      await resend.emails.send({
      from: 'App <onboarding@resend.dev>',
      to: this.to,
      subject,
      html,
      text: convert(html),
    });
  }

  // 🎉 Send a warm Welcome email
  async sendWelcome() {
    await this.send('welcome', 'Welcome to the App!');
  }

  // 🔐 Send password reset instructions
  async sendPasswordReset() {
    await this.send('passwordReset', 'Reset your password');
  }
}

module.exports = Email; // 📦 Export the superhero for use in your app