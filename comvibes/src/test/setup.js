import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cada prueba empieza con el DOM y el almacenamiento del navegador limpios.
afterEach(() => {
  cleanup()
  localStorage.clear()
})
