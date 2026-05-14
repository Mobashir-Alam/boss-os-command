import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Founder OS'

interface MfaCodeProps {
  code?: string
  expiresInMinutes?: number
}

const MfaCodeEmail = ({ code = '000000', expiresInMinutes = 10 }: MfaCodeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} verification code: {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoBox}>
          <span style={logoText}>F</span>
        </div>
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>
          Use this code to finish signing in to {SITE_NAME}. It expires in{' '}
          <strong>{expiresInMinutes} minutes</strong>.
        </Text>
        <div style={codeBox}>
          <span style={codeText}>{code}</span>
        </div>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't try to sign in, ignore this email — and consider rotating your password.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MfaCodeEmail,
  subject: `Your ${SITE_NAME} verification code`,
  displayName: 'Verification code',
  previewData: { code: '482917', expiresInMinutes: 10 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logoBox: React.CSSProperties = {
  width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#000',
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
}
const logoText: React.CSSProperties = { color: '#fff', fontWeight: 'bold' }
const h1 = { color: '#111', fontSize: '20px', fontWeight: '600', margin: '0 0 12px' }
const text = { color: '#444', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px' }
const codeBox: React.CSSProperties = {
  backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '20px', textAlign: 'center',
  margin: '8px 0 24px',
}
const codeText: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace',
  fontSize: '32px', fontWeight: 'bold', letterSpacing: '8px', color: '#111',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { color: '#888', fontSize: '12px', lineHeight: '1.5', margin: 0 }
