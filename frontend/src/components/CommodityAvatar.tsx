// Avatar komoditas: emoji + latar lembut, dipilih dari nama komoditas.
const EMOJI_MAP: Array<{ keys: string[]; emoji: string }> = [
  { keys: ['cabai', 'cabe', 'lombok', 'chili'], emoji: '🌶️' },
  { keys: ['tomat'], emoji: '🍅' },
  { keys: ['selada', 'lettuce'], emoji: '🥬' },
  { keys: ['bayam', 'kangkung', 'sawi', 'pakcoy', 'caisim'], emoji: '🥬' },
  { keys: ['terong', 'terung'], emoji: '🍆' },
  { keys: ['jagung'], emoji: '🌽' },
  { keys: ['wortel'], emoji: '🥕' },
  { keys: ['bawang'], emoji: '🧅' },
  { keys: ['kentang'], emoji: '🥔' },
  { keys: ['timun', 'mentimun'], emoji: '🥒' },
  { keys: ['padi', 'beras'], emoji: '🌾' },
  { keys: ['stroberi', 'strawberry'], emoji: '🍓' },
  { keys: ['melon'], emoji: '🍈' },
  { keys: ['semangka'], emoji: '🍉' },
  { keys: ['brokoli', 'kembang kol', 'kubis', 'kol'], emoji: '🥦' },
  { keys: ['jamur'], emoji: '🍄' },
  { keys: ['paprika'], emoji: '🫑' },
];

// Daftar emoji yang tersedia untuk dipilih user di form
export const EMOJI_OPTIONS = [
  '🌶️', '🍅', '🥬', '🍆', '🌽', '🥕', '🧅', '🥔', '🥒',
  '🌾', '🍓', '🍈', '🍉', '🥦', '🍄', '🫑', '🌱', '🌿',
  '🍀', '🌻', '🌸', '🍊', '🍋', '🍌', '🥭', '🍇', '🫘',
  '🥜', '🌰', '🧄', '🥝', '🍑', '🍍', '🥥', '☕', '🍃',
];

const BG_PALETTE = [
  'bg-[#DCFCE7] text-[#15803D]',
  'bg-[#FEF3C7] text-[#B45309]',
  'bg-[#E0F2FE] text-[#0369A1]',
  'bg-[#F3E8FF] text-[#7E22CE]',
  'bg-[#FFE4E6] text-[#BE123C]',
  'bg-[#E2E8F0] text-[#475569]',
];

function emojiFor(name: string): string {
  const lower = name.toLowerCase();
  for (const entry of EMOJI_MAP) {
    if (entry.keys.some((k) => lower.includes(k))) return entry.emoji;
  }
  return '🌱';
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return BG_PALETTE[hash % BG_PALETTE.length];
}

interface Props {
  komoditas: string;
  icon?: string | null;
  className?: string;
}

export function CommodityAvatar({ komoditas, icon, className = '' }: Props): React.JSX.Element {
  return (
    <div className={`kbn-avatar ${colorFor(komoditas)} ${className}`} aria-hidden="true">
      {icon || emojiFor(komoditas)}
    </div>
  );
}
