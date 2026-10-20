/**
 * BrandMark — "The Scribe's Play"
 *
 * TypeScribe's brand glyph: a play triangle with a fountain-pen nib slit
 * and breather hole. Reads as a nib at large sizes; degrades to a clean
 * play glyph at small sizes. Uses currentColor so context decides tint
 * (gold on dark surfaces, deep-ink on gold tiles).
 */
export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 168 118 Q 168 98 190 110 L 366 230 Q 400 256 366 282 L 190 402 Q 168 414 168 394 Q 168 256 168 118 Z M 232 256 A 26 26 0 1 1 180 256 A 26 26 0 1 1 232 256 Z M 368 251 L 272 251 L 272 261 L 368 261 Q 373 256 368 251 Z"
      />
    </svg>
  );
}
