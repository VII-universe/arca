"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addRecipient, removeRecipient } from "@/app/actions/delivery";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecipientData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  challengeQuestion: string | null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RecipientManager({
  packId,
  initialRecipients,
}: {
  packId: string;
  initialRecipients: RecipientData[];
}) {
  const router = useRouter();
  const [recipients, setRecipients] = useState(initialRecipients);
  const [showForm, setShowForm] = useState(initialRecipients.length === 0);

  // Sync when Server Component re-renders after router.refresh()
  useEffect(() => {
    setRecipients(initialRecipients);
  }, [initialRecipients]);

  const handleAdded = () => {
    setShowForm(false);
    router.refresh();
  };

  const handleRemoved = (id: string) => {
    // Optimistic removal
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* Existing recipients */}
      {recipients.length > 0 && (
        <ul className="space-y-2">
          {recipients.map((r) => (
            <RecipientRow
              key={r.id}
              recipient={r}
              onRemoved={handleRemoved}
            />
          ))}
        </ul>
      )}

      {/* Add form or reveal button */}
      {showForm ? (
        <AddRecipientForm
          packId={packId}
          onSuccess={handleAdded}
          onCancel={
            recipients.length > 0 ? () => setShowForm(false) : undefined
          }
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-neutral-700 text-xs">
            +
          </span>
          Add another recipient
        </button>
      )}
    </div>
  );
}

// ─── Recipient row ────────────────────────────────────────────────────────────

function RecipientRow({
  recipient,
  onRemoved,
}: {
  recipient: RecipientData;
  onRemoved: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const initials = recipient.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeRecipient(recipient.id);
      if ("ok" in result) {
        onRemoved(recipient.id);
      }
    });
  };

  return (
    <li
      className={[
        "group flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 transition-opacity",
        isPending ? "opacity-40" : "",
      ].join(" ")}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-400">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-200 truncate">
          {recipient.name}
        </p>
        <p className="text-xs text-neutral-600 truncate">
          {[recipient.email, recipient.phone].filter(Boolean).join(" · ")}
          {recipient.challengeQuestion && (
            <span className="ml-2 text-neutral-700">· Challenge set</span>
          )}
        </p>
      </div>

      {/* Delete controls */}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {confirm ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-500">Remove?</span>
            <button
              onClick={handleRemove}
              className="text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="text-xs text-neutral-700 hover:text-neutral-400 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </li>
  );
}

// ─── Add form ─────────────────────────────────────────────────────────────────

function AddRecipientForm({
  packId,
  onSuccess,
  onCancel,
}: {
  packId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addRecipient(null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setShowChallenge(false);
        onSuccess();
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-xl border border-neutral-700/60 bg-neutral-900/40 p-5 space-y-4"
    >
      <input type="hidden" name="packId" value={packId} />

      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
        New Recipient
      </p>

      {/* Name */}
      <Field label="Full name" name="name" placeholder="Jane Smith" required />

      {/* Email + phone side by side */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" placeholder="jane@example.com" />
        <Field label="Phone" name="phone" type="tel" placeholder="+1 555 000 0000" />
      </div>

      {/* Challenge toggle */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowChallenge((v) => !v)}
          className="flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          <span
            className={[
              "flex h-4 w-7 items-center rounded-full transition-colors duration-200 px-0.5",
              showChallenge ? "bg-neutral-500" : "bg-neutral-800",
            ].join(" ")}
          >
            <span
              className={[
                "h-3 w-3 rounded-full bg-white transition-transform duration-200",
                showChallenge ? "translate-x-3" : "translate-x-0",
              ].join(" ")}
            />
          </span>
          Add a challenge question for extra security
        </button>

        {showChallenge && (
          <div className="space-y-3 pl-2 border-l-2 border-neutral-800">
            <Field
              label="Challenge question"
              name="challengeQuestion"
              placeholder="What was the name of our first pet?"
            />
            <Field
              label="Answer"
              name="challengeAnswer"
              placeholder="Only your recipient should know this"
            />
            <p className="text-[11px] text-neutral-700 leading-snug">
              The answer is hashed and never stored in plain text. Case and
              trailing spaces are ignored on comparison.
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-white transition-colors disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add Recipient"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Reusable field ───────────────────────────────────────────────────────────

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={name}
        className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-600"
      >
        {label}
        {required && <span className="ml-1 text-neutral-700">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-700 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors"
      />
    </div>
  );
}
