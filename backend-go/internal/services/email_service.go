package services

import (
	"bytes"
	"fmt"
	htmltemplate "html/template"
	"net/smtp"
	texttemplate "text/template"
)

type EmailService struct {
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	FromName     string
}

type EmailTemplate struct {
	Subject string
	HTML    string
	Text    string
}

func NewEmailService(smtpHost, smtpPort, smtpUsername, smtpPassword, fromEmail, fromName string) *EmailService {
	return &EmailService{
		SMTPHost:     smtpHost,
		SMTPPort:     smtpPort,
		SMTPUsername: smtpUsername,
		SMTPPassword: smtpPassword,
		FromEmail:    fromEmail,
		FromName:     fromName,
	}
}

// SendVerificationEmail sends email verification link
func (e *EmailService) SendVerificationEmail(to, verificationToken string) error {
	template := EmailTemplate{
		Subject: "Verify Your Synthos Account",
		HTML: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Account</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">Welcome to Synthos!</h1>
        <p>Thank you for signing up for Synthos, the enterprise synthetic data platform.</p>
        <p>To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.VerificationURL}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">{{.VerificationURL}}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">If you didn't create an account with Synthos, you can safely ignore this email.</p>
    </div>
</body>
</html>`,
		Text: `Welcome to Synthos!

Thank you for signing up for Synthos, the enterprise synthetic data platform.

To complete your registration, please verify your email address by visiting this link:
{{.VerificationURL}}

This link will expire in 24 hours.

If you didn't create an account with Synthos, you can safely ignore this email.`,
	}

	data := map[string]string{
		"VerificationURL": fmt.Sprintf("https://synthos.dev/verify-email?token=%s", verificationToken),
	}

	return e.sendEmail(to, template, data)
}

// SendPasswordResetEmail sends password reset link
func (e *EmailService) SendPasswordResetEmail(to, resetToken string) error {
	template := EmailTemplate{
		Subject: "Reset Your Synthos Password",
		HTML: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">Password Reset Request</h1>
        <p>We received a request to reset your password for your Synthos account.</p>
        <p>To reset your password, please click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.ResetURL}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">{{.ResetURL}}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
</body>
</html>`,
		Text: `Password Reset Request

We received a request to reset your password for your Synthos account.

To reset your password, please visit this link:
{{.ResetURL}}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.`,
	}

	data := map[string]string{
		"ResetURL": fmt.Sprintf("https://synthos.dev/reset-password?token=%s", resetToken),
	}

	return e.sendEmail(to, template, data)
}

// SendWelcomeEmail sends welcome email after successful verification
func (e *EmailService) SendWelcomeEmail(to, fullName string) error {
	template := EmailTemplate{
		Subject: "Welcome to Synthos - Your Account is Ready!",
		HTML: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Synthos</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">Welcome to Synthos, {{.FullName}}!</h1>
        <p>Your account has been successfully verified and is ready to use.</p>
        <p>Here's what you can do next:</p>
        <ul>
            <li>Upload your first dataset</li>
            <li>Generate synthetic data using our AI models</li>
            <li>Explore our advanced privacy features</li>
            <li>Check out our documentation</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://synthos.dev/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
        </div>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">This email was sent to {{.Email}} because you created an account with Synthos.</p>
    </div>
</body>
</html>`,
		Text: `Welcome to Synthos, {{.FullName}}!

Your account has been successfully verified and is ready to use.

Here's what you can do next:
- Upload your first dataset
- Generate synthetic data using our AI models
- Explore our advanced privacy features
- Check out our documentation

Get started: https://synthos.dev/dashboard

If you have any questions, feel free to reach out to our support team.`,
	}

	data := map[string]string{
		"FullName": fullName,
		"Email":    to,
	}

	return e.sendEmail(to, template, data)
}

// sendEmail sends an email using SMTP
func (e *EmailService) sendEmail(to string, template EmailTemplate, data map[string]string) error {
	// Parse HTML template
	htmlTmpl, err := htmltemplate.New("html").Parse(template.HTML)
	if err != nil {
		return err
	}

	// Parse text template
	textTmpl, err := texttemplate.New("text").Parse(template.Text)
	if err != nil {
		return err
	}

	// Execute templates with data
	var htmlBuf, textBuf bytes.Buffer
	if err := htmlTmpl.Execute(&htmlBuf, data); err != nil {
		return err
	}
	if err := textTmpl.Execute(&textBuf, data); err != nil {
		return err
	}

	// Create email message
	message := fmt.Sprintf("From: %s <%s>\r\n", e.FromName, e.FromEmail)
	message += fmt.Sprintf("To: %s\r\n", to)
	message += fmt.Sprintf("Subject: %s\r\n", template.Subject)
	message += "MIME-Version: 1.0\r\n"
	message += "Content-Type: multipart/alternative; boundary=\"boundary123\"\r\n"
	message += "\r\n--boundary123\r\n"
	message += "Content-Type: text/plain; charset=UTF-8\r\n"
	message += "\r\n" + textBuf.String() + "\r\n"
	message += "\r\n--boundary123\r\n"
	message += "Content-Type: text/html; charset=UTF-8\r\n"
	message += "\r\n" + htmlBuf.String() + "\r\n"
	message += "\r\n--boundary123--\r\n"

	// Send email
	auth := smtp.PlainAuth("", e.SMTPUsername, e.SMTPPassword, e.SMTPHost)
	addr := e.SMTPHost + ":" + e.SMTPPort
	return smtp.SendMail(addr, auth, e.FromEmail, []string{to}, []byte(message))
}
