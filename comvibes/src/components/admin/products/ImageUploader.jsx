import { useState } from 'react'
import { useToast } from '../../../context/ToastContext'
import { uploadImagen, resolveImageUrl, deleteImagen } from '../../../api/uploads'
import placeholderSvg from '../../../assets/img/productos/placeholder.svg'

const MAX_FOTOS = 5
// 8 MB: el backend recomprime con sharp antes de guardar, así que conviene
// subir la foto buena en vez de una miniatura ya comprimida.
const MAX_BYTES = 8 * 1024 * 1024

// Galería de fotos del producto: agregar, reemplazar y quitar. La primera
// foto es la principal.
//
// `galeria` es la lista de URLs ya subidas. `onGaleriaChange` recibe una
// función (prev) => next, igual que un setState, para no perder cambios si
// dos subidas terminan casi al mismo tiempo.
function ImageUploader({ galeria, onGaleriaChange }) {
  const toast = useToast()
  const [subiendo, setSubiendo] = useState(false)

  const subir = async (e, index = null) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast.warning('Imagen demasiado grande', 'El tamaño máximo es 8 MB')
      e.target.value = ''
      return
    }
    setSubiendo(true)
    try {
      const { url, advertencia, dimensiones } = await uploadImagen(file)
      // index === null → agregar al final; si no, reemplazar esa posición
      onGaleriaChange((prev) =>
        index === null ? [...prev, url] : prev.map((u, i) => (i === index ? url : u))
      )
      // El backend acepta las imágenes chicas, pero avisa: son las que se ven
      // borrosas en la ficha del producto.
      if (advertencia) {
        toast.warning('Imagen de baja resolución', advertencia)
      } else {
        toast.success('Imagen subida correctamente', `Optimizada a ${dimensiones} px`)
      }
    } catch (err) {
      toast.error('No se pudo subir la imagen', err.message)
    } finally {
      setSubiendo(false)
    }
  }

  const quitar = (index) => {
    const url = galeria[index]
    // Solo se borra del servidor si la subió el admin (ruta /uploads/)
    if (url && url.includes('/uploads/')) {
      deleteImagen(url) // fire-and-forget — no bloquea la UI
    }
    onGaleriaChange((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className='col-12 mb-3'>
      <label className='form-label'>Imágenes del producto</label>

      <div className='d-flex flex-wrap gap-3 mb-3'>
        {galeria.map((url, i) => (
          <div key={url + i} className='position-relative' style={{ width: 100, height: 100 }}>
            <img
              src={resolveImageUrl(url)}
              alt={`Foto ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: i === 0 ? '2px solid #3b82f6' : '1px solid #e5e7eb' }}
              onError={(e) => { e.target.src = placeholderSvg }}
            />
            {i === 0 && (
              <span style={{ position: 'absolute', bottom: 2, left: 2, background: '#3b82f6', color: '#fff', fontSize: '0.6rem', fontWeight: 700, borderRadius: 4, padding: '1px 5px' }}>
                Principal
              </span>
            )}
            <button
              type='button'
              className='btn btn-danger btn-sm rounded-circle d-flex align-items-center justify-content-center'
              style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, padding: 0, fontSize: '0.7rem', lineHeight: 1 }}
              onClick={() => quitar(i)}
              aria-label={`Quitar foto ${i + 1}`}
            >✕</button>
            <label
              style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.65rem', borderRadius: 4, padding: '1px 5px', cursor: 'pointer' }}
              title='Reemplazar'
            >
              ↺
              <input type='file' accept='image/*' className='d-none' onChange={(e) => subir(e, i)} />
            </label>
          </div>
        ))}

        {galeria.length < MAX_FOTOS && (
          <label
            style={{ width: 100, height: 100, border: '2px dashed #cbd5e1', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '0.78rem', gap: 4 }}
            title='Subir imagen'
          >
            {subiendo ? '⏳' : '＋'}
            <span>{subiendo ? 'Subiendo...' : 'Agregar foto'}</span>
            <input
              type='file'
              accept='image/jpeg,image/png,image/webp'
              className='d-none'
              disabled={subiendo}
              onChange={(e) => subir(e)}
            />
          </label>
        )}
      </div>

      <small className='text-muted'>
        La primera foto es la imagen principal. Máx. {MAX_FOTOS} fotos, 8 MB c/u. JPG, PNG o WEBP.
      </small>
    </div>
  )
}

export default ImageUploader
