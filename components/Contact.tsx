"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sendEmail } from "@/lib/sendEmail";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type TouchedState = {
  name: boolean;
  email: boolean;
  subject: boolean;
  message: boolean;
};

type Status = "idle" | "loading" | "success" | "error";

function validate(form: FormState) {
  const errors: Partial<FormState> = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.subject.trim()) errors.subject = "Subject is required.";
  if (!form.message.trim()) {
    errors.message = "Message is required.";
  } else if (form.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters.";
  }
  return errors;
}

/** Label above each field */
function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-mono text-neutral-500 uppercase"
      style={{ fontSize: "9px", letterSpacing: "0.18em", display: "block", marginBottom: "6px" }}
    >
      {children}
    </label>
  );
}

/** Inline validation error line */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      className="font-mono text-red-400"
      style={{ fontSize: "9px", letterSpacing: "0.04em", marginTop: "5px" }}
    >
      {message}
    </p>
  );
}

export default function Contact() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [touched, setTouched] = useState<TouchedState>({
    name: false,
    email: false,
    subject: false,
    message: false,
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, subject: true, message: true });
    if (!isValid) return;

    setStatus("loading");
    setErrorMsg("");
    const result = await sendEmail(form);

    if (result.success) {
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
      setTouched({ name: false, email: false, subject: false, message: false });
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Something went wrong.");
    }
  };

  /** Border colour reacts to error / focus */
  const inputStyle = (field: keyof FormState): React.CSSProperties => ({
    width: "100%",
    padding: "10px 13px",
    background: "#ffffff",
    border: `1px solid ${touched[field] && errors[field] ? "#fca5a5" : "#e5e3df"}`,
    borderRadius: "7px",
    fontSize: "13px",
    fontFamily: "inherit",
    color: "#111111",
    outline: "none",
    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
  });

  return (
    <section id="contact" style={{ paddingTop: "24px", paddingBottom: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <p
          className="font-mono text-neutral-400 uppercase"
          style={{ fontSize: "10px", letterSpacing: "0.2em", marginBottom: "20px" }}
        >
          Get In Touch
        </p>
        <p
          className="text-neutral-900 font-semibold"
          style={{ fontSize: "22px", letterSpacing: "-0.01em", marginBottom: "8px" }}
        >
          Let&apos;s build something great together.
        </p>
        <p className="text-neutral-400" style={{ fontSize: "13px", lineHeight: 1.7 }}>
          I&apos;m open to full-time opportunities and interesting collaborations.
        </p>
      </div>

      {/* Card wrapper — gives the form a clean lifted look */}
      <div
        style={{
          maxWidth: "560px",
          background: "#faf9f7",
          border: "1px solid #e5e3df",
          borderRadius: "14px",
          padding: "28px 28px 24px",
        }}
      >
        <form onSubmit={handleSubmit} noValidate>

          {/* Row: Name + Email */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2"
            style={{ gap: "16px", marginBottom: "16px" }}
          >
            {/* Name */}
            <div>
              <Label htmlFor="name">Name</Label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Kannan S"
                value={form.name}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="name"
                style={inputStyle("name")}
                aria-describedby={touched.name && errors.name ? "name-error" : undefined}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#a3a09b";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.04)";
                }}
                onBlurCapture={(e) => {
                  e.currentTarget.style.borderColor =
                    touched.name && errors.name ? "#fca5a5" : "#e5e3df";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <FieldError id="name-error" message={touched.name ? errors.name : undefined} />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="hello@example.com"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                style={inputStyle("email")}
                aria-describedby={touched.email && errors.email ? "email-error" : undefined}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#a3a09b";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.04)";
                }}
                onBlurCapture={(e) => {
                  e.currentTarget.style.borderColor =
                    touched.email && errors.email ? "#fca5a5" : "#e5e3df";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <FieldError id="email-error" message={touched.email ? errors.email : undefined} />
            </div>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: "16px" }}>
            <Label htmlFor="subject">Subject</Label>
            <input
              id="subject"
              name="subject"
              type="text"
              placeholder="Project collaboration / Opportunity"
              value={form.subject}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle("subject")}
              aria-describedby={touched.subject && errors.subject ? "subject-error" : undefined}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#a3a09b";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.04)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor =
                  touched.subject && errors.subject ? "#fca5a5" : "#e5e3df";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <FieldError id="subject-error" message={touched.subject ? errors.subject : undefined} />
          </div>

          {/* Message */}
          <div style={{ marginBottom: "22px" }}>
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              name="message"
              rows={5}
              placeholder="Hey Kannan, I'd love to discuss..."
              value={form.message}
              onChange={handleChange}
              onBlur={handleBlur}
              style={{
                ...inputStyle("message"),
                resize: "none",
                lineHeight: "1.7",
              }}
              aria-describedby={touched.message && errors.message ? "message-error" : undefined}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#a3a09b";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.04)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor =
                  touched.message && errors.message ? "#fca5a5" : "#e5e3df";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <FieldError id="message-error" message={touched.message ? errors.message : undefined} />
          </div>

          {/* Footer row: button + feedback */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <button
              id="send-message-btn"
              type="submit"
              disabled={status === "loading"}
              className="group inline-flex items-center gap-2 font-mono text-neutral-900 hover:text-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
              style={{
                fontSize: "10px",
                letterSpacing: "0.18em",
                paddingBottom: "2px",
                borderBottom: "1px solid currentColor",
              }}
            >
              <span>{status === "loading" ? "SENDING..." : "SEND MESSAGE"}</span>
              <ArrowUpRight
                size={12}
                className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200"
              />
            </button>

            {status === "success" && (
              <p
                className="font-mono text-green-600"
                style={{ fontSize: "10px", letterSpacing: "0.05em" }}
              >
                Sent — I&apos;ll reply soon ✓
              </p>
            )}
            {status === "error" && (
              <p
                className="font-mono text-red-400"
                style={{ fontSize: "10px", letterSpacing: "0.05em" }}
              >
                {errorMsg}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
