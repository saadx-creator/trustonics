"use client";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <SelectPrimitive.Root
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger id={id} className="select-trigger">
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon>
            <ChevronDown size={16} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="select-content"
            position="popper"
            sideOffset={5}
          >
            <SelectPrimitive.Viewport>
              {options.map((o) => (
                <SelectPrimitive.Item
                  className="select-item"
                  key={o.value}
                  value={o.value}
                >
                  <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check size={15} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
