import { api } from './client'

// Bitácora de acciones administrativas (solo admin). Auditoría ISO, H12.
export const getAuditoria = (params = {}) => api.get('/auditoria', { params })
