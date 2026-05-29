export default function Button({ children, onClick, disabled, variant = 'primary', className = '', type = 'button' }) {
  const base = 'w-full rounded-xl py-3 px-6 font-bold text-base min-h-[48px] transition-colors duration-150 focus:outline-none active:scale-95 cursor-pointer';
  const variants = {
    primary: 'bg-game-blue hover:bg-game-blue-dark text-white disabled:opacity-40 disabled:cursor-not-allowed',
    secondary: 'bg-game-card border border-game-border hover:bg-game-border text-game-text disabled:opacity-40',
    danger: 'bg-game-red hover:bg-red-700 text-white disabled:opacity-40',
    ghost: 'bg-transparent border border-game-border hover:bg-game-card text-game-muted disabled:opacity-40',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
