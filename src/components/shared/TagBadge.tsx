import type { Tag } from "@/types/wallet";

interface TagBadgeProps {
  tag: Tag;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
      }}
    >
      {tag.name}
    </span>
  );
}
