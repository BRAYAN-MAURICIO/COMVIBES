function ProductFilters({ categorias, selectedCategory, onSelectCategory, sortOrder, onSortChange }) {
  return (
    <div className='d-flex flex-wrap align-items-center gap-2 mb-4'>
      <button
        type='button'
        className={`btn btn-sm rounded-pill ${!selectedCategory ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onSelectCategory(null)}
      >
        Todas
      </button>

      {categorias.map((cat) => (
        <button
          key={cat.idCat}
          type='button'
          className={`btn btn-sm rounded-pill ${
            selectedCategory === cat.idCat ? 'btn-primary' : 'btn-outline-primary'
          }`}
          onClick={() => onSelectCategory(cat.idCat)}
        >
          {cat.nombre}
        </button>
      ))}

      <select
        className='form-select form-select-sm ms-lg-auto'
        style={{ maxWidth: '220px' }}
        value={sortOrder}
        onChange={(e) => onSortChange(e.target.value)}
        aria-label='Ordenar productos'
      >
        <option value='newest'>Más recientes</option>
        <option value='precio-asc'>Precio: menor a mayor</option>
        <option value='precio-desc'>Precio: mayor a menor</option>
        <option value='nombre-asc'>Nombre: A-Z</option>
      </select>
    </div>
  )
}

export default ProductFilters
