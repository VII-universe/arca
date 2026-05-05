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

interface ArcaDeliveryEmailProps {
  recipientName: string;
  ownerName: string;
  livingLinkUrl: string;
}

export function ArcaDeliveryEmail({
  recipientName,
  ownerName,
  livingLinkUrl,
}: ArcaDeliveryEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {ownerName} has entrusted you with a secure message — it is ready to be
        opened.
      </Preview>
      <Body className="bg-gray-50 font-sans">
        <Container className="mx-auto max-w-xl py-12 px-6">
          <Section className="bg-white rounded-2xl px-10 py-10 shadow-sm">
            <Heading className="text-2xl font-semibold text-gray-900 mb-2">
              You have received an Arca.
            </Heading>

            <Text className="text-gray-500 text-sm mt-0 mb-8">
              A message prepared with care, now ready for you.
            </Text>

            <Text className="text-gray-700 text-base leading-relaxed">
              Dear {recipientName},
            </Text>

            <Text className="text-gray-700 text-base leading-relaxed">
              <strong>{ownerName}</strong> has entrusted you with an Arca — a
              secure, private message pack prepared in advance, meant to reach
              you at exactly this moment.
            </Text>

            <Text className="text-gray-700 text-base leading-relaxed">
              When you are ready, click the button below to access it securely.
              You may be asked a personal question to verify your identity before
              the contents are revealed.
            </Text>

            <Section className="text-center my-8">
              <Button
                href={livingLinkUrl}
                className="bg-gray-900 text-white text-sm font-medium rounded-lg px-6 py-3 no-underline"
              >
                Open your Arca
              </Button>
            </Section>

            <Hr className="border-gray-100 my-6" />

            <Text className="text-gray-400 text-xs leading-relaxed">
              This link is unique to you. Please do not share it. If you were
              not expecting this message, you may contact the person who sent it
              or disregard this email entirely.
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

export default ArcaDeliveryEmail;
