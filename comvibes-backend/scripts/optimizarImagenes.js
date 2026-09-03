/**
 * npm run fix:imagenes
 *
 * Normaliza las imágenes que YA están en uploads/productos, aplicando el mismo
 * criterio que las subidas nuevas: lienzo cuadrado con fondo blanco, lado
 * máximo 1200 px y recompresión.
 *
 * Conserva el nombre y la extensión de cada archivo, así las URLs guardadas en
 * la base de datos siguen funcionando sin tocar ni una fila.
 *
 * Los originales se copian a  backup_uploads/productos/  (fuera de uploads/,
 * para que no queden accesibles públicamente). Si algo sale mal, se restauran
 * copiándolos de vuelta.
 *
 * Lo que NO puede hacer: inventar píxeles. Una foto de 225×225 va a seguir
 * siendo de 225×225 — el script la deja cuadrada y liviana, pero para que se
 * vea nítida hay que volver a subirla en un tamaño mayor.
 */

const path = require('path')
const fs = require('fs/promises')
const sharp = require('sharp')

const DIR = path.join(__dirname, '../uploads/productos')
const BACKUP = path.join(__dirname, '../backup_uploads/productos')

const LADO_MAX = 1200
const LADO_MIN_RECOMENDADO = 600
const FONDO = { r: 255, g: 255, b: 255, alpha: 1 }

const EXTENSIONES = ['.jpg', '.jpeg', '.png', '.webp']

// Cada formato conserva el suyo, para no romper las URLs ya guardadas.
function aplicarFormato(pipeline, ext) {
  if (ext === '.png')  return pipeline.png({ compressionLevel: 9, palette: true })
  if (ext === '.webp') return pipeline.webp({ quality: 82, effort: 4 })
  return pipeline.jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' })
}

async function main() {
  await fs.mkdir(BACKUP, { recursive: true })

  const archivos = (await fs.readdir(DIR)).filter((f) =>
    EXTENSIONES.includes(path.extname(f).toLowerCase())
  )

  if (archivos.length === 0) {
    console.log('No hay imágenes que procesar en uploads/productos.')
    return
  }

  console.log(`Procesando ${archivos.length} imágenes...\n`)

  let ahorro = 0
  const chicas = []

  for (const nombre of archivos) {
    const origen = path.join(DIR, nombre)
    const ext = path.extname(nombre).toLowerCase()

    try {
      const buffer = await fs.readFile(origen)
      const meta = await sharp(buffer).metadata()
      const ancho = meta.width || 0
      const alto = meta.height || 0
      if (!ancho || !alto) throw new Error('sin dimensiones legibles')

      // Backup del original (solo la primera vez que se corre el script)
      const backupPath = path.join(BACKUP, nombre)
      try {
        await fs.access(backupPath)
      } catch {
        await fs.copyFile(origen, backupPath)
      }

      const lado = Math.min(LADO_MAX, Math.max(ancho, alto))

      let pipeline = sharp(buffer)
        .rotate()
        .flatten({ background: FONDO })
        .resize(lado, lado, {
          fit: 'contain',
          background: FONDO,
          kernel: sharp.kernel.lanczos3,
        })
      pipeline = aplicarFormato(pipeline, ext)

      const salida = await pipeline.toBuffer()
      await fs.writeFile(origen, salida)

      const antes = buffer.length
      const despues = salida.length
      ahorro += antes - despues

      const kb = (n) => `${Math.round(n / 1024)} KB`
      const flechita = despues < antes ? '↓' : '↑'
      console.log(
        `  ${nombre.padEnd(42)} ${ancho}×${alto} → ${lado}×${lado}   ${kb(antes)} ${flechita} ${kb(despues)}`
      )

      if (Math.min(ancho, alto) < LADO_MIN_RECOMENDADO) {
        chicas.push(`${nombre} (${ancho}×${alto})`)
      }
    } catch (err) {
      console.error(`  ✗ ${nombre}: ${err.message}`)
    }
  }

  console.log(`\nListo. Espacio ahorrado: ${Math.round(ahorro / 1024)} KB`)
  console.log(`Originales respaldados en backup_uploads/productos/`)

  if (chicas.length > 0) {
    console.log(
      `\n⚠  ${chicas.length} imagen(es) por debajo de ${LADO_MIN_RECOMENDADO}px — se van a seguir viendo`
    )
    console.log('   borrosas hasta que las vuelvas a subir en mejor resolución:\n')
    chicas.forEach((c) => console.log(`   · ${c}`))
  }
}

main().catch((err) => {
  console.error('Falló el procesado:', err)
  process.exit(1)
})
