import { TOKEN_KEY } from './client'

// La carpeta de imágenes vive en el servidor Express.
// VITE_BACKEND_URL apunta a la raíz del backend (no a /api),
// porque las imágenes se sirven en /uploads/productos/<file>.
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
const API     = import.meta.env.VITE_API_URL      || 'http://localhost:4000/api'

/**
 * Construye la URL completa de una imagen dado lo que devuelve el backend.
 * Casos:
 *   - '/uploads/productos/file.jpg'  → 'http://localhost:4000/uploads/productos/file.jpg'
 *   - 'http://...'                   → se devuelve tal cual (URL externa)
 *   - '/src/assets/img/...'          → ruta Vite local (solo en dev)
 *   - 'file.jpg' (solo filename)     → 'http://localhost:4000/uploads/productos/file.jpg'
 *   - null / ''                      → null  (ProductImage mostrará el placeholder)
 */
export function resolveImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/')) return `${BACKEND}${url}`
  // Rutas locales de Vite en dev — se dejan igual
  if (url.startsWith('/')) return url
  // Nombre de archivo plano (ej. 'camiseta-basica.jpg'): asumir que vive
  // en la carpeta de productos del backend.
  return `${BACKEND}/uploads/productos/${url}`
}

/**
 * Sube un archivo de imagen al backend y devuelve { url, filename, size }.
 * `url` es la ruta relativa  '/uploads/productos/<file>'  que se guarda
 * en imagen_url del producto.
 */
export async function uploadImagen(file) {
  const token = localStorage.getItem(TOKEN_KEY)
  const form  = new FormData()
  form.append('imagen', file)

  const res = await fetch(`${API}/uploads/imagen`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  const json = await res.json()
  if (!json.success) throw new Error(json.message || 'Error al subir la imagen')
  return json.data
}

/**
 * Elimina un archivo subido del servidor.
 * Se llama cuando el admin quita una imagen del formulario
 * antes de guardar el producto, para evitar archivos huérfanos.
 * El filename es la última parte de la URL: 'uploads/productos/<filename>'
 */
export async function deleteImagen(url) {
  if (!url || !url.includes('/uploads/productos/')) return
  const filename = url.split('/uploads/productos/').pop()
  const token = localStorage.getItem(TOKEN_KEY)
  await fetch(`${API}/uploads/imagen/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  // Falla silenciosamente — si el archivo ya no existe no importa
}
