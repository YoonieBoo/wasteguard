const LOADING_LETTERS = 'Loading...'.split('')

export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-6">
      <img src="/loading-screen.png" alt="" className="h-64 w-64 object-contain sm:h-80 sm:w-80" />
      <p className="flex text-2xl font-black text-primary sm:text-3xl" aria-label="Loading">
        {LOADING_LETTERS.map((letter, index) => (
          <span
            key={index}
            className="inline-block"
            style={{
              animation: 'loading-text-wave 1.4s ease-in-out infinite',
              animationDelay: `${index * 0.08}s`,
              width: letter === ' ' ? '0.35em' : undefined,
            }}
          >
            {letter}
          </span>
        ))}
      </p>
    </div>
  )
}
