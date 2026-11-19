"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";
import type { AdministrativeUnit } from "../types/vendor-registration.types";
import { searchKey } from "../utils/registration-form";

interface SearchableSelectProps {
  label: string;
  required?: boolean;
  placeholder: string;
  options: AdministrativeUnit[];
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  disabledHint?: string;
  loading?: boolean;
  error?: string;
  /** Optional fields get a clear button. */
  clearable?: boolean;
}

/**
 * A text box that filters a long list as you type, accent-insensitively
 * ("ca mau" finds "Cà Mau"). Keyboard: arrows to move, Enter to pick, Escape to close.
 */
export function SearchableSelect({
  label,
  required,
  placeholder,
  options,
  value,
  onChange,
  disabled,
  disabledHint,
  loading,
  error,
  clearable,
}: SearchableSelectProps) {
  const id = useId();
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const wrapper = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selected = options.find((option) => option.code === value);

  const indexed = useMemo(() => options.map((option) => ({ option, key: searchKey(option.name) })), [options]);
  const filtered = useMemo(() => {
    const q = searchKey(query);
    return q ? indexed.filter((entry) => entry.key.includes(q)).map((entry) => entry.option) : options;
  }, [indexed, options, query]);

  // Close when focus or a click leaves the field.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (option: AdministrativeUnit) => {
    onChange(option.code);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      if (open && filtered[active]) {
        event.preventDefault();
        pick(filtered[active]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const isDisabled = disabled || loading;

  return (
    <div ref={wrapper} className="relative">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label} {required && <span className="text-[#E63946]">*</span>}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[active] ? `${id}-opt-${filtered[active].code}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          disabled={isDisabled}
          value={open ? query : (selected?.name ?? "")}
          placeholder={isDisabled && disabledHint ? disabledHint : placeholder}
          onFocus={() => {
            setQuery("");
            setActive(0);
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          // Options keep focus on pointer-down, so this only fires when focus really leaves (e.g. Tab).
          onBlur={() => setOpen(false)}
          className={`w-full rounded-xl border bg-sky-50/70 py-3 pl-4 pr-16 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0F3860] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${
            error ? "border-rose-400" : "border-transparent"
          }`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1 text-slate-400">
          {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ChevronDown className="h-4 w-4" />}
        </span>
        {clearable && value && !isDisabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Bỏ chọn ${label.toLowerCase()}`}
            className="absolute inset-y-0 right-8 my-auto flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && !isDisabled && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-slate-500">Không tìm thấy kết quả phù hợp.</li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.code}
                id={`${id}-opt-${option.code}`}
                data-index={index}
                role="option"
                aria-selected={option.code === value}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
                onPointerEnter={() => setActive(index)}
                className={`cursor-pointer px-4 py-2.5 text-sm ${
                  index === active ? "bg-sky-50 text-[#0F3860]" : "text-slate-700"
                } ${option.code === value ? "font-semibold" : ""}`}
              >
                {option.name}
              </li>
            ))
          )}
        </ul>
      )}

      {error && (
        <p id={errorId} className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
