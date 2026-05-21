import { forwardRef, type ComponentRef, type ComponentPropsWithoutRef } from "react"
import { Root as SeparatorRoot } from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = forwardRef<
  ComponentRef<typeof SeparatorRoot>,
  ComponentPropsWithoutRef<typeof SeparatorRoot>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorRoot
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorRoot.displayName

export { Separator }
