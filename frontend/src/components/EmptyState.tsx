import { EmptyStateIllustration } from '@/components/empty-state-illustration'

interface EmptyStateProps {
  message?: string
  action?: React.ReactNode
}

export function EmptyState({
  message = 'Ops! Parece que não tem nada por aqui',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 select-none">
      <EmptyStateIllustration className="w-60 text-[#51596b]" />
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        {action}
      </div>
    </div>
  )
}
