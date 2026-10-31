'use client'

import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'

function subscribe(callback: () => void) {
  window.addEventListener('themechange', callback)
  return () => window.removeEventListener('themechange', callback)
}

export function useLightTheme() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === 'light', () => false)
}

export function ThemeToggle() {
  const light = useLightTheme()
  const label = light ? 'Switch to dark theme' : 'Switch to light theme'
  return (
    <button type="button" className="theme-toggle" aria-label={label} title={label} onClick={() => {
      const theme = light ? 'dark' : 'light'
      document.documentElement.dataset.theme = theme
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#08080e' : '#eee7fa')
      try { localStorage.setItem('devharbour-theme', theme) } catch {}
      window.dispatchEvent(new Event('themechange'))
    }}>
      {light ? <Moon size={17} /> : <Sun size={17} />}
      <span>{light ? 'Dark mode' : 'Light mode'}</span>
    </button>
  )
}
