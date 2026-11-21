import * as React from "react";
import { cn } from "@/lib/utils";

/** Liste déroulante native : la plus pratique sur mobile. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "border-input h-10 w-full rounded-md border bg-transparent px-3 text-base shadow-xs outline-none md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
