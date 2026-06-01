export default function Card({ children, className = '', style }) {
  return (
    <div className={`bg-game-card border border-game-border rounded-2xl p-4 ${className}`} style={style}>
      {children}
    </div>
  );
}
