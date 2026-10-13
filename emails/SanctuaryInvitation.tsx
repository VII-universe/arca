import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SanctuaryInvitationProps {
  ownerName: string;
  sanctuaryUrl: string;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: "#0a0a0a",
  margin: 0,
  padding: 0,
  WebkitTextSizeAdjust: "100%",
};

const container: React.CSSProperties = {
  maxWidth: 540,
  margin: "0 auto",
  padding: "72px 40px 60px",
  backgroundColor: "#0a0a0a",
};

const serif = "'Georgia', 'Times New Roman', 'Times', serif";
const sans  = "'Helvetica Neue', 'Arial', sans-serif";

// ── Component ─────────────────────────────────────────────────────────────────

export function SanctuaryInvitation({ ownerName, sanctuaryUrl }: SanctuaryInvitationProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {ownerName} has left you a message that&apos;s waiting just for you.
      </Preview>

      <Body style={body}>
        <Container style={container}>

          {/* ARCA mark */}
          <Section style={{ textAlign: "center", marginBottom: 64 }}>
            <Text style={{
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: 15,
              color: "rgba(245, 240, 223, 0.28)",
              letterSpacing: "0.22em",
              margin: 0,
            }}>
              arca
            </Text>
          </Section>

          {/* Main message */}
          <Section style={{ textAlign: "center" }}>
            <Text style={{
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: 24,
              lineHeight: "1.55",
              color: "#f5f0df",
              fontWeight: 400,
              margin: "0 0 4px",
              letterSpacing: "0.01em",
            }}>
              {ownerName} has left you a message.
            </Text>
            <Text style={{
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: 24,
              lineHeight: "1.55",
              color: "#f5f0df",
              fontWeight: 400,
              margin: 0,
              letterSpacing: "0.01em",
            }}>
              It&apos;s time to open it.
            </Text>
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: "center", padding: "52px 0 44px" }}>
            <Link
              href={sanctuaryUrl}
              style={{
                display: "inline-block",
                padding: "13px 36px",
                border: "1px solid rgba(245, 240, 223, 0.2)",
                borderRadius: "4px",
                color: "#f5f0df",
                fontFamily: serif,
                fontStyle: "italic",
                fontSize: 15,
                letterSpacing: "0.05em",
                textDecoration: "none",
              }}
            >
              Enter the vault →
            </Link>
          </Section>

          {/* Divider */}
          <Hr style={{
            borderTop: "1px solid rgba(245, 240, 223, 0.07)",
            borderBottom: "none",
            margin: "0 0 28px",
          }} />

          {/* Footer */}
          <Section style={{ textAlign: "center" }}>
            <Text style={{
              fontFamily: sans,
              fontSize: 11,
              color: "#a1a1aa",
              lineHeight: "1.7",
              letterSpacing: "0.02em",
              margin: 0,
            }}>
              This link is protected for security reasons and is meant for you alone.
              <br />
              Please don&apos;t forward it to anyone else.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default SanctuaryInvitation;
