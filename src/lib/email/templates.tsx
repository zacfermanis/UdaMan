import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Preview,
  Button,
  Hr,
  Section,
  Heading,
  Img,
} from '@react-email/components'

interface EmailVerificationTemplateProps {
  userEmail: string
  displayName: string
  verificationUrl: string
  appName?: string
  appUrl?: string
}

export const EmailVerificationTemplate = ({
  userEmail,
  displayName,
  verificationUrl,
  appName = 'Udaman',
  appUrl = 'http://localhost:3001'
}: EmailVerificationTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address for {appName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={`${appUrl}/Udaman_Logo.webp`}
              width="120"
              height="48"
              alt={appName}
              style={logo}
            />
          </Section>

          <Section style={content}>
            <Heading style={h1}>Verify your email address</Heading>
            
            <Text style={text}>
              Hi {displayName},
            </Text>
            
            <Text style={text}>
              Thanks for signing up for {appName}! To complete your registration, please verify your email address by clicking the button below:
            </Text>

            <Button style={button} href={verificationUrl}>
              Verify Email Address
            </Button>

            <Text style={text}>
              If the button doesn't work, you can copy and paste this link into your browser:
            </Text>
            
            <Link href={verificationUrl} style={link}>
              {verificationUrl}
            </Link>

            <Text style={text}>
              This link will expire in 24 hours. If you didn't create an account with {appName}, you can safely ignore this email.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {userEmail}. If you have any questions, please contact our support team.
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} {appName}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

interface PasswordResetTemplateProps {
  userEmail: string
  displayName: string
  resetUrl: string
  appName?: string
  appUrl?: string
}

export const PasswordResetTemplate = ({
  userEmail,
  displayName,
  resetUrl,
  appName = 'Udaman',
  appUrl = 'http://localhost:3001'
}: PasswordResetTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your password for {appName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={`${appUrl}/Udaman_Logo.webp`}
              width="120"
              height="48"
              alt={appName}
              style={logo}
            />
          </Section>

          <Section style={content}>
            <Heading style={h1}>Reset your password</Heading>
            
            <Text style={text}>
              Hi {displayName},
            </Text>
            
            <Text style={text}>
              We received a request to reset your password for your {appName} account. Click the button below to create a new password:
            </Text>

            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>

            <Text style={text}>
              If the button doesn't work, you can copy and paste this link into your browser:
            </Text>
            
            <Link href={resetUrl} style={link}>
              {resetUrl}
            </Link>

            <Text style={text}>
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {userEmail}. If you have any questions, please contact our support team.
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} {appName}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  textAlign: 'center' as const,
  padding: '20px 0',
}

const logo = {
  margin: '0 auto',
}

const content = {
  padding: '0 48px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
  margin: '24px 0',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const footer = {
  padding: '0 48px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
  textAlign: 'center' as const,
}
