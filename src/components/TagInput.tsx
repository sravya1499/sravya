import { useState, useCallback, useRef, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  chipClass?: string;
  max?: number;
}

export default function TagInput({
  label,
  values,
  onChange,
  suggestions,
  placeholder = "Type and press Enter…",
  chipClass = "chip-skill",
  max = 20,
}: Props) {
  const [input, setInput] = useState("");
  const [showSugg, setShowSugg] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = useCallback(
    (val: string) => {
      const v = val.trim();
      if (!v || values.includes(v) || values.length >= max) return;
      onChange([...values, v]);
      setInput("");
    },
    [values, onChange, max],
  );

  const remove = (val: string) => onChange(values.filter((v) => v !== val));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && !input && values.length) {
      remove(values[values.length - 1]);
    }
  };

  const filtered = (suggestions ?? [])
    .filter((s) => s.toLowerCase().includes(input.toLowerCase()))
    .filter((s) => !values.includes(s))
    .slice(0, 6);

  return (
    <div>
      <label className="label">{label}</label>
      <div
        className="input flex flex-wrap items-center gap-1.5 py-2"
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v) => (
          <span key={v} className={cn(chipClass, "pr-1")}>
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(v);
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setShowSugg(true)}
          onBlur={() => setTimeout(() => setShowSugg(false), 150)}
          placeholder={values.length ? "" : placeholder}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-ink-400"
        />
      </div>
      {showSugg && filtered.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => add(s)}
              className="chip-neutral hover:bg-brand-100 hover:text-brand-700"
            >
              <Plus className="h-3 w-3" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
