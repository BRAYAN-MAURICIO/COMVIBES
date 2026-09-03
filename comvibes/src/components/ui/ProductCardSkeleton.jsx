// Skeleton con la misma silueta que ProductCard, para el estado de carga
// del catálogo. Reemplaza el spinner-border por algo que "se siente" más
// parecido al contenido real mientras carga.
function ProductCardSkeleton() {
  return (
    <div className='card shadow-sm border-0 rounded-4 h-100 overflow-hidden' aria-hidden='true'>
      <div className='skeleton' style={{ height: '220px' }} />

      <div className='card-body d-flex flex-column gap-2'>
        <div className='skeleton skeleton-text' style={{ width: '75%', height: '20px' }} />
        <div className='skeleton skeleton-text' style={{ width: '40%', height: '14px' }} />
        <div className='skeleton skeleton-text' style={{ width: '55%', height: '24px', marginTop: '4px' }} />
        <div className='skeleton skeleton-text' style={{ width: '35%', height: '20px', borderRadius: '999px' }} />
        <div className='skeleton' style={{ width: '100%', height: '38px', marginTop: 'auto' }} />
      </div>
    </div>
  )
}

export default ProductCardSkeleton
