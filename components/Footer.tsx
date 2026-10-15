import Link from './Link'

export default function Footer() {
  return (
    <footer>
      <div className="mt-16 flex flex-col items-center border-t border-gray-200 pt-8 dark:border-gray-700">
        <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          CodeSeed · 码芽 · © 2021-2025 Timothy Lin
        </div>
        <div className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          基于{' '}
          <Link href="https://github.com/timlrx/tailwind-nextjs-starter-blog">
            Tailwind Nextjs Starter Blog
          </Link>
          ，遵循 MIT License
        </div>
      </div>
    </footer>
  )
}
