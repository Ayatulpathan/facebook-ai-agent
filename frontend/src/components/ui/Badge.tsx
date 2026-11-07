import React from 'react'
import { cn } from '../../utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline' | 'info'
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-950/70 text-emerald-400 border-emerald-800',
    warning: 'bg-amber-950/70 text-amber-400 border-amber-800',
    danger: 'bg-red-950/70 text-red-400 border-red-800',
    info: 'bg-blue-950/70 text-blue-400 border-blue-800',
    outline: 'text-slate-400 border-slate-700'
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
