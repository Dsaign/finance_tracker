import { forwardRef, type ComponentRef, type ComponentPropsWithoutRef } from "react"
import { Root as Tabs, List, Trigger, Content } from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const TabsList = forwardRef<
  ComponentRef<typeof List>,
  ComponentPropsWithoutRef<typeof List>
>(({ className, ...props }, ref) => (
  <List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = List.displayName

const TabsTrigger = forwardRef<
  ComponentRef<typeof Trigger>,
  ComponentPropsWithoutRef<typeof Trigger>
>(({ className, ...props }, ref) => (
  <Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = Trigger.displayName

const TabsContent = forwardRef<
  ComponentRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content>
>(({ className, ...props }, ref) => (
  <Content
    ref={ref}
    className={cn(
      "mt-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
