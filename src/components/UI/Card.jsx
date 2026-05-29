export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-game-card border border-game-border rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  );
}
