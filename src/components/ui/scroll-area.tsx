"use client"

import { useEffect, useRef, useState } from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { cn } from "../../lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  const [scrolling, setScrolling] = useState(false)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
  }, [])

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
        onScroll={() => {
          setScrolling(true)
          if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
          scrollTimeout.current = setTimeout(() => setScrolling(false), 650)
        }}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar scrolling={scrolling} />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  scrolling = false,
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props & { scrolling?: boolean }) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={state => cn(
        "flex touch-none p-px opacity-0 transition-opacity duration-150 select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        (scrolling || state.scrolling) && "opacity-100",
        typeof className === "function" ? className(state) : className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
