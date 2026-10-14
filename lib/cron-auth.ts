// Shared constant-time Bearer-token check for cron routes
// (pulse/process-triggers duplicate this inline; new cron routes should use
// this instead of copy-pasting it a fourth time).
export function isAuthorizedCronRequest(request: Request): boolean {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const secret = process.env.CRON_SECRET;
  if (!secret || !token || token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}
