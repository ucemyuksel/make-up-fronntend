import * as React from "react";

export function Button({
  children,
  variant = "primary",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  return (
    <button className={`gg-btn gg-btn-${variant}${className ? " " + className : ""}`} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`gg-card${className ? " " + className : ""}`} {...rest}>
      {children}
    </div>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="gg-pill">{children}</span>;
}
