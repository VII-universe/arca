// Legal operator details for the footer — read from env, never hardcoded,
// so they can change (or be filled in for the first time) without a code
// change. Any field left unset is simply not rendered.
export interface OperatorInfo {
  name: string | null;
  address: string | null;
  companyId: string | null;
  email: string | null;
}

function env(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getOperatorInfo(): OperatorInfo {
  return {
    name: env(process.env.NEXT_PUBLIC_OPERATOR_NAME),
    address: env(process.env.NEXT_PUBLIC_OPERATOR_ADDRESS),
    companyId: env(process.env.NEXT_PUBLIC_OPERATOR_ID),
    email: env(process.env.NEXT_PUBLIC_OPERATOR_EMAIL),
  };
}
