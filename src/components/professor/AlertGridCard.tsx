import { motion } from 'framer-motion';

interface AlertGridCardProps {
  icon: string;
  label: string;
  count: number;
  badgeCount: number;
  colorActive: string;
  onClick: () => void;
}

export const AlertGridCard = ({
  icon,
  label,
  count,
  badgeCount,
  colorActive,
  onClick
}: AlertGridCardProps) => {
  const isActive = count > 0;
  const hasBadge = badgeCount > 0;

  return (
    <motion.button
      onClick={onClick}
      disabled={!isActive}
      whileHover={isActive ? { scale: 1.02 } : undefined}
      whileTap={isActive ? { scale: 0.98 } : undefined}
      className="relative flex flex-col items-center justify-center py-4 px-3 rounded-xl transition-all duration-200 min-h-[100px]"
      style={{
        backgroundColor: isActive ? colorActive : '#2A2A2A',
        cursor: isActive ? 'pointer' : 'default'
      }}
    >
      {/* Badge de notificação */}
      {hasBadge && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 bg-red-500 rounded-full opacity-50"
          />
          <span className="text-white text-xs font-bold relative z-10">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        </motion.div>
      )}

      {/* Ícone + Número */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xl">{icon}</span>
        <span 
          className="text-2xl font-bold"
          style={{ color: isActive ? '#FFFFFF' : '#888888' }}
        >
          {count}
        </span>
      </div>

      {/* Label */}
      <span 
        className="text-xs text-center leading-tight font-medium"
        style={{ color: isActive ? 'rgba(255,255,255,0.9)' : '#888888' }}
      >
        {label}
      </span>
    </motion.button>
  );
};
