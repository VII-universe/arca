import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface InactivityReminderEmailProps {
  userName: string;
  daysInactive: number;
  dashboardUrl: string;
}

export function InactivityReminderEmail({
  userName,
  daysInactive,
  dashboardUrl,
}: InactivityReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>It&apos;s been a while — a quick check-in on your Arca</Preview>
      <Body className="bg-gray-50 font-sans">
        <Container className="mx-auto max-w-xl py-12 px-6">
          <Section className="bg-white rounded-2xl px-10 py-10 shadow-sm">
            <Heading className="text-2xl font-semibold text-gray-900 mb-2">
              Hi {userName},
            </Heading>

            <Text className="text-gray-500 text-sm mt-0 mb-8">
              It&apos;s been about {daysInactive} days since you last visited Arca.
            </Text>

            <Text className="text-gray-700 text-base leading-relaxed">
              No action is required — this isn&apos;t a security notice, just a
              friendly nudge. A lot can change in a few months: new people in
              your life, updated contact details, a thought you&apos;d like to
              add to a message.
            </Text>

            <Text className="text-gray-700 text-base leading-relaxed">
              Take a minute to look over what you&apos;ve written. Everything
              will still be exactly as you left it.
            </Text>

            <Section className="text-center my-8">
              <Button
                href={dashboardUrl}
                className="bg-gray-900 text-white text-sm font-medium rounded-lg px-6 py-3 no-underline"
              >
                Review my vault
              </Button>
            </Section>

            <Hr className="border-gray-100 my-6" />

            <Text className="text-gray-400 text-xs leading-relaxed">
              You&apos;re receiving this because you have at least one message
              saved in Arca. We only send this reminder occasionally.
            </Text>
          </Section>

          <Text className="text-center text-gray-400 text-xs mt-6">
            Arca — your words, preserved with care.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InactivityReminderEmail;
