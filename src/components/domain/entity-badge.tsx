import { cn, getEntityTypeColor } from "@/lib/utils";

interface EntityBadgeProps {
  name: string;
  type: string;
  verified?: boolean;
  className?: string;
}

export function EntityBadge({ name, type, verified, className }: EntityBadgeProps) {
  const color = getEntityTypeColor(type);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm font-medium text-text-primary">{name}</span>
      {verified && (
        <svg
          className="h-3.5 w-3.5 text-accent-cyan"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </span>
  );
}
