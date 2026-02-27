import type React from "react";

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const uid = () => Math.random().toString(36).slice(2);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SetParamFn = (id: string, kind: any, patch: any) => void;

export function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="paramPane__row">
      <div className="paramPane__label">{label}</div>
      <div className="paramPane__control">{children}</div>
    </div>
  );
}
