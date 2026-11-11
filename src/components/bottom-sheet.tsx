import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle } from './ui/sheet'

export function BottomSheet({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode }) {
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" showCloseButton={false} className="surface mx-auto max-h-[82dvh] w-full gap-0 overflow-hidden rounded-t-2xl p-5 xl:max-w-[720px] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
        <SheetClose render={<Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Fechar" />}><X size={18} /></SheetClose>
      </div>
      <div className="min-h-0 overflow-y-auto">{children}</div>
    </SheetContent>
  </Sheet>
}
