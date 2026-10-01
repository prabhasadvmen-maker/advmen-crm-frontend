import { cn } from '@/utils/cn';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  status?: 'online' | 'busy' | 'away' | 'offline';
  className?: string;
}

const VIBRANT_PALETTE = [
  { bg: '#2563EB', border: '#1D4ED8' }, // Blue
  { bg: '#4F46E5', border: '#4338CA' }, // Indigo
  { bg: '#059669', border: '#047857' }, // Emerald
  { bg: '#7C3AED', border: '#6D28D9' }, // Violet
  { bg: '#D97706', border: '#B45309' }, // Amber
  { bg: '#E11D48', border: '#BE123C' }, // Rose
  { bg: '#0D9488', border: '#0F766E' }, // Teal
  { bg: '#9333EA', border: '#7E22CE' }, // Purple
  { bg: '#0284C7', border: '#0369A1' }, // Sky
];

function getAvatarTheme(name: string) {
  if (!name || typeof name !== 'string') return VIBRANT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % VIBRANT_PALETTE.length;
  return VIBRANT_PALETTE[index];
}

export function Avatar({ name, size = 'md', status, className }: AvatarProps) {
  const cleanName = (name || 'User').trim();
  const parts = cleanName.split(' ').filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : cleanName.slice(0, 1).toUpperCase();

  const sizeStyles = {
    xs: 'w-6 h-6 text-[10px] font-bold',
    sm: 'w-7 h-7 text-xs font-bold',
    md: 'w-9 h-9 text-xs font-bold',
    lg: 'w-11 h-11 text-sm font-bold',
  };

  const statusDotSizes = {
    xs: 'w-1.5 h-1.5 bottom-0 right-0',
    sm: 'w-2 h-2 bottom-0 right-0',
    md: 'w-2.5 h-2.5 bottom-0 right-0',
    lg: 'w-3 h-3 bottom-0.5 right-0.5',
  };

  const statusColors = {
    online: 'bg-green-500 ring-white',
    busy: 'bg-rose-500 ring-white',
    away: 'bg-amber-500 ring-white',
    offline: 'bg-neutral-400 ring-white',
  };

  const theme = getAvatarTheme(cleanName);

  return (
    <div className={cn('relative inline-block select-none shrink-0', className)}>
      <div
        style={{
          backgroundColor: theme.bg,
          color: '#ffffff',
          borderColor: theme.border,
        }}
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-bold shadow-sm ring-1 ring-white/60 tracking-wider border',
          sizeStyles[size]
        )}
      >
        <span className="leading-none text-white drop-shadow-sm select-none font-mono">
          {initials}
        </span>
      </div>
      {status && (
        <span
          className={cn(
            'absolute rounded-full ring-2 shadow-sm',
            statusDotSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

export function AvatarGroup({
  users,
  max = 3,
  size = 'sm',
}: {
  users: Array<{ name: string; avatarUrl?: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex items-center -space-x-2 overflow-hidden">
      {visible.map((u, i) => (
        <Avatar key={i} name={u.name} size={size} className="ring-2 ring-white" />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'rounded-full bg-neutral-800 text-white font-bold flex items-center justify-center ring-2 ring-white',
            size === 'xs' ? 'w-6 h-6 text-[10px]' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-xs'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
