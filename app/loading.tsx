export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg)]"
    >
      <div className="discord" />
    </div>
  );
}
