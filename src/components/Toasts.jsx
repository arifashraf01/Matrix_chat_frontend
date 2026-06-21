import { useEffect } from "react";

function Toasts({ toasts = [], onDismiss }) {
  useEffect(() => {
    if (!toasts || toasts.length === 0) return undefined;

    const timers = toasts.map((t) =>
      setTimeout(() => {
        onDismiss?.(t.id);
      }, t.duration || 4000),
    );

    return () => timers.forEach(clearTimeout);
  }, [toasts, onDismiss]);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type || "info"}`} role="status" aria-live="polite">
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default Toasts;
