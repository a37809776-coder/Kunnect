"use client";

/** 공유 항목 토글 카드 — 폼(name) 또는 제어형(checked/onChange)으로 쓴다 */
export default function ShareToggle({
  name,
  label,
  hint,
  defaultChecked,
  checked,
  onChange,
  disabled,
}: {
  name?: string;
  label: string;
  hint: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-card bg-leaf-50 px-4 py-4 has-[:checked]:bg-leaf-100">
      <span className="flex-1">
        <span className="block text-body font-bold text-leaf-900">{label}</span>
        <span className="block text-caption text-leaf-700">{hint}</span>
      </span>
      <input
        type="checkbox"
        name={name}
        role="switch"
        defaultChecked={defaultChecked}
        checked={checked}
        disabled={disabled}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-leaf-300 transition peer-checked:bg-leaf-500 peer-focus-visible:ring-2 peer-focus-visible:ring-leaf-700 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-paper after:transition peer-checked:after:translate-x-5"
      />
    </label>
  );
}
