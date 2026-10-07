interface PokeballProps {
  className?: string
  top?: string
  bottom?: string
  stroke?: string
}

export function Pokeball({ className, top = '#e3350d', bottom = '#f4f4f4', stroke = '#1a1a1a' }: PokeballProps) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill={top} stroke={stroke} strokeWidth="6" />
      <path d="M4 50 A46 46 0 0 0 96 50 Z" fill={bottom} stroke={stroke} strokeWidth="6" />
      <line x1="4" y1="50" x2="96" y2="50" stroke={stroke} strokeWidth="6" />
      <circle cx="50" cy="50" r="13" fill={bottom} stroke={stroke} strokeWidth="6" />
    </svg>
  )
}
