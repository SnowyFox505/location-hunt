export default function Input({ label, type = 'text', value, onChange, placeholder, autoComplete, className = '' }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-game-muted text-sm font-medium">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`bg-game-card border border-game-border rounded-lg px-4 py-3 text-game-text placeholder-game-muted focus:outline-none focus:border-game-blue transition-colors min-h-[48px] ${className}`}
      />
    </div>
  );
}
