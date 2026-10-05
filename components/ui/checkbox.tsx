"use client";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
export function Checkbox(
  props: React.ComponentProps<typeof CheckboxPrimitive.Root>,
) {
  return (
    <CheckboxPrimitive.Root className="checkbox" {...props}>
      <CheckboxPrimitive.Indicator>
        <Check size={14} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
