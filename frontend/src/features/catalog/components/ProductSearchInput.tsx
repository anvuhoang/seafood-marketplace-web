"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fetchSuggestions, type ProductSuggestion } from "../api/suggest.api";

const MIN_LENGTH = 2;
const DELAY_MS = 200;

interface ProductSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** A suggestion was chosen (click or Enter on it): search for its name. */
  onPick: (name: string) => void;
  placeholder: string;
  className?: string;
}

/**
 * The search field with product names suggested while the visitor types. It waits a moment after the last key, asks
 * the API, and shows at most eight names; arrow keys move through them, Enter picks one, Escape closes the list.
 * If the API does not answer there are simply no suggestions and the field works as a plain input.
 */
export function ProductSearchInput({ value, onChange, onPick, placeholder, className }: ProductSearchInputProps) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  // The text the visitor picked: asking about it again would only reopen the list they just closed.
  const picked = useRef<string | null>(null);

  useEffect(() => {
    const text = value.trim();
    if (text.length < MIN_LENGTH || text === picked.current) {
      // Nothing to suggest: the list is cleared when the answers come back empty, not by setting state here.
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchSuggestions(text, controller.signal).then((found) => {
        if (controller.signal.aborted) return;
        setSuggestions(found);
        setActive(-1);
        setOpen(found.length > 0);
      });
    }, DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const visible = open && value.trim().length >= MIN_LENGTH && suggestions.length > 0;

  function pick(name: string) {
    picked.current = name.trim();
    setOpen(false);
    onChange(name);
    onPick(name);
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <input
        type="text"
        value={value}
        onChange={(event) => {
          picked.current = null;
          onChange(event.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(event) => {
          if (!visible) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            pick(suggestions[active]!.name);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label="Tìm hải sản"
        className={className}
      />
      {visible && (
        <ul id={listId} role="listbox" aria-label="Gợi ý sản phẩm" className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.slug} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
              <button
                type="button"
                // mousedown, not click: the field loses focus before a click would arrive and the list would be gone.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(suggestion.name);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn("block w-full truncate px-4 py-2 text-left text-sm text-slate-700", index === active ? "bg-slate-100 text-[#0F3860]" : "hover:bg-slate-50")}
              >
                {suggestion.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
