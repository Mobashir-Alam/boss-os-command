import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Founder OS"

interface TeamInviteProps {
  role?: string
  invitedBy?: string
  signupUrl?: string
}

const roleLabels: Record<string, string> = {
  mfo: "MFO (Manager)",
  functional_head: "Functional Head",
  project_manager: "Project Manager",
  team_member: "Team Member",
}

const TeamInviteEmail = ({ role, invitedBy, signupUrl }: TeamInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoBox}>
          <span style={logoText}>F</span>
        </div>
        <Heading style={h1}>You're invited to {SITE_NAME}</Heading>
        <Text style={text}>
          {invitedBy ? `${invitedBy} has` : "You've been"} invited you to join {SITE_NAME}
          {role ? ` as a ${roleLabels[role] || role}` : ""}.
        </Text>
        <Text style={text}>
          {SITE_NAME} is a strategic execution platform that helps teams move from strategy to action with clarity and speed.
        </Text>
        <Button style={button} href={signupUrl || "https://boss-os-command.lovable.app/login"}>
          Accept Invite & Sign Up
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't expect this invitation, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInviteEmail,
  subject: `You've been invited to join ${SITE_NAME}`,
  displayName: 'Team invitation',
  previewData: { role: 'project_manager', invitedBy: 'Adil Meraj', signupUrl: 'https://boss-os-command.lovable.app/login' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logoBox: React.CSSProperties = {
  width: '40px', height: '40px', borderRadius: '10px',
  backgroundColor: 'hsl(222.2, 47.4%, 11.2%)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
}
const logoText: React.CSSProperties = { color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222.2, 84%, 4.9%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(215.4, 16.3%, 46.9%)', lineHeight: '1.6', margin: '0 0 16px' }
const button: React.CSSProperties = {
  backgroundColor: 'hsl(222.2, 47.4%, 11.2%)', color: 'hsl(210, 40%, 98%)',
  padding: '12px 24px', borderRadius: '8px', fontSize: '14px',
  fontWeight: 'bold', textDecoration: 'none', display: 'inline-block',
  margin: '8px 0 24px',
}
const hr = { borderColor: 'hsl(214.3, 31.8%, 91.4%)', margin: '24px 0' }
const footer = { fontSize: '12px', color: 'hsl(215.4, 16.3%, 46.9%)', margin: '0' }
