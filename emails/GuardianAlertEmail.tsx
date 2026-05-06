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

interface GuardianAlertEmailProps {
  guardianName: string;
  ownerName: string;
  packTitle: string;
  confirmAliveUrl: string;
  releaseUrl: string;
  expiresInHours: number;
}

export function GuardianAlertEmail({
  guardianName,
  ownerName,
  packTitle,
  confirmAliveUrl,
  releaseUrl,
  expiresInHours,
}: GuardianAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`${ownerName} may need your help — a trusted confirmation is requested`}
      </Preview>
      <Body className="bg-gray-50 font-sans">
        <Container className="mx-auto max-w-xl py-12 px-6">
          <Section className="bg-white rounded-2xl px-10 py-10 shadow-sm">
            <Heading className="text-2xl font-semibold text-gray-900 mb-2">
              A trusted voice is needed.
            </Heading>

            <Text className="text-gray-500 text-sm mt-0 mb-8">
              You are listed as a Guardian for {ownerName} on Arca.
            </Text>

            <Text className="text-gray-700 text-base leading-relaxed">
              We haven&apos;t received any activity from{" "}
              <strong>{ownerName}</strong> recently. As a result, their Arca
              titled <strong>&quot;{packTitle}&quot;</strong> is ready to be
              delivered.
            </Text>

            <Text className="text-gray-700 text-base leading-relaxed">
              As a trusted Guardian, we need you to confirm one of the following
              before we proceed:
            </Text>

            <Section className="my-8 space-y-3">
              <div style={{ marginBottom: "12px" }}>
                <Button
                  href={confirmAliveUrl}
                  className="bg-gray-900 text-white text-sm font-medium rounded-lg px-6 py-3 no-underline w-full text-center block"
                >
                  ✓ &nbsp;{ownerName} is fine — cancel delivery
                </Button>
              </div>
              <div>
                <Button
                  href={releaseUrl}
                  className="bg-red-600 text-white text-sm font-medium rounded-lg px-6 py-3 no-underline w-full text-center block"
                >
                  ↑ &nbsp;Release — deliver the Arca now
                </Button>
              </div>
            </Section>

            <Text className="text-gray-500 text-sm leading-relaxed">
              These links expire in <strong>{expiresInHours} hours</strong>.
              Each link can only be used once.
            </Text>

            <Hr className="border-gray-100 my-6" />

            <Text className="text-gray-400 text-xs leading-relaxed">
              You received this because {ownerName} designated you as a Guardian
              in their Arca account. If you believe this is an error, please
              disregard this email. Do not click &quot;Release&quot; unless you
              are certain the situation warrants immediate delivery.
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

export default GuardianAlertEmail;
