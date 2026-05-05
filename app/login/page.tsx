import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign In — Final Words" };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Final Words</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Your digital legacy, secured.
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
