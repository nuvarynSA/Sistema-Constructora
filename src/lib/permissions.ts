export const isAdminRoleName = (roleName?: string | null): boolean => {
  if (!roleName) return false
  const normalized = roleName.trim().toLowerCase()
  return (
    normalized === 'administrador' ||
    normalized.startsWith('administrador ') ||
    normalized === 'admin' ||
    normalized.startsWith('admin ')
  )
}
