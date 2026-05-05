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

interface GracePeriodWarningEmailProps {
  userName: string;
  packTitle: string;
  daysLeft: number;
  cancelUrl: string;
}

export function GracePeriodWarningEmail({
  userName,
  packTitle,
  daysLeft,
  cancelUrl,
}: GracePeriodWarningEmailProps) {
  const dayWord = daysLeft === 1 ? "day" : "days";

  return (
    <Html>
      <Head />
      <Preview>
        {`Your Arca "${packTitle}" will be delivered in ${daysLeft} ${dayWord}`}
      </Preview>
      <Body className="bg-gray-50 font-sans">
        <Container className="mx-auto max-w-xl py-12 px-6">
          <Section className="bg-white rounded-2xl px-10 py-10 shadow-sm">
            <Heading className="text-2xl font-semibold text-gray-900 mb-2">
              A gentle notice, {userName}.
            </Heading>

            <Text className="text-gray-500 text-sm mt-0 mb-8">
              We haven&apos;t seen any activity from you recently.
            </Text>

            <Text className="text-gray-700 text-base leading-relaxed">
              Your Arca titled{" "}
              <strong>&quot;{packTitle}&quot;</strong> is scheduled to be
              delivered to its recipients in{" "}
              <strong>
                {daysLeft} {dayWord}
              </strong>
              .
            </Text>

            <Text className="text-gray-700 text-base leading-relaxed">
              If you are well and wish to keep this Arca sealed, please click
              the button below to cancel the delivery and reset your timer. No
              further action will be required.
            </Text>

            <Section className="text-center my-8">
              <Button
                href={cancelUrl}
                className="bg-gray-900 text-white text-sm font-medium rounded-lg px-6 py-3 no-underline"
              >
                I&apos;m okay — cancel delivery
              </Button>
            </Section>

            <Hr className="border-gray-100 my-6" />

            <Text className="text-gray-400 text-xs leading-relaxed">
              If you did not create an Arca or believe this message was sent in
              error, you can safely ignore it. This notice was sent because your
              account has an active inactivity trigger configured.
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

export default GracePeriodWarningEmail;
