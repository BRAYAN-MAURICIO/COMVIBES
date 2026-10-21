import { useState, useEffect, useCallback } from 'react'

/**
 * Carga datos del API y los mantiene en estado, sin los problemas del patrón
 * `useEffect(() => { fetchX() }, [fetchX])` que se repetía en contexts y páginas
 * (auditoría ISO 2026-09-26, fase 3):
 *
 * - No hace `setState` sincrónico dentro del efecto (regla
 *   react-hooks/set-state-in-effect): el estado se actualiza cuando llega la
 *   respuesta, y `cargando` se DERIVA en vez de guardarse.
 * - Descarta respuestas viejas: si cambian los filtros o el usuario antes de
 *   que llegue la respuesta anterior, esa respuesta se ignora.
 * - Los datos quedan asociados a lo que los trajo (la función `cargar` y la
 *   `clave`). Si cualquiera de las dos cambia, los datos anteriores dejan de
 *   mostrarse de inmediato. Antes, al cerrar sesión y entrar con otra cuenta,
 *   por un instante se veían los pedidos o direcciones de la cuenta anterior.
 *
 * @param {() => Promise<any>} cargar  Función que trae los datos. Debe ser estable:
 *   una función importada del API o un useCallback con sus dependencias.
 * @param {object}  [opciones]
 * @param {boolean} [opciones.habilitado=true]  Si es false no se carga y `datos` vale `inicial`
 *                                               (p. ej. sin sesión iniciada).
 * @param {any}     [opciones.clave]             Valor que identifica a quién pertenecen los datos
 *                                               (p. ej. el idUsu de la sesión). Si cambia, se recarga.
 * @param {any}     [opciones.inicial]           Valor mientras no hay datos.
 * @returns {{ datos, setDatos, cargando, error, recargar }}
 *   - setDatos: igual que un setState, para actualizaciones optimistas tras crear/editar.
 *   - recargar: vuelve a pedir los datos; devuelve una promesa que se puede esperar.
 */
export function useCarga(cargar, { habilitado = true, clave = null, inicial } = {}) {
  // Se fija una vez: así `datos` conserva la misma identidad mientras no hay
  // datos (un [] literal nuevo en cada render dispararía useMemo/useEffect).
  const [valorInicial] = useState(inicial)
  const [estado, setEstado] = useState({ cargar: null, clave: undefined, datos: undefined, error: null })

  useEffect(() => {
    if (!habilitado) return undefined
    let vigente = true
    cargar().then(
      (datos) => { if (vigente) setEstado({ cargar, clave, datos, error: null }) },
      (error) => { if (vigente) setEstado({ cargar, clave, datos: undefined, error }) }
    )
    return () => { vigente = false }
  }, [cargar, clave, habilitado])

  const vigentes = habilitado && estado.cargar === cargar && estado.clave === clave

  const setDatos = useCallback(
    (actualizar) =>
      setEstado((prev) => ({
        ...prev,
        datos: typeof actualizar === 'function' ? actualizar(prev.datos ?? valorInicial) : actualizar,
      })),
    [valorInicial]
  )

  const recargar = useCallback(async () => {
    const datos = await cargar()
    setEstado({ cargar, clave, datos, error: null })
    return datos
  }, [cargar, clave])

  return {
    datos: vigentes && estado.datos !== undefined ? estado.datos : valorInicial,
    setDatos,
    cargando: habilitado && !vigentes,
    error: vigentes ? estado.error : null,
    recargar,
  }
}
