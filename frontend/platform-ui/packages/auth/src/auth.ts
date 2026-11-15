let _baseUrl = ''

export function configureAuth(baseUrl: string): void {
  _baseUrl = baseUrl
}

export function getAuthBaseUrl(): string {
  return _baseUrl
}

export const authLogin = async (idps?: string | null): Promise<void> => {
  if (idps && idps !== 'google,microsoft' && idps !== 'google' && idps !== 'microsoft') {
    window.location.href = `${_baseUrl}/api/auth/login?idps=${idps}&autheticationSource=enterpriseIdpAuthentication`
  } else {
    window.location.href = `${_baseUrl}/api/auth/login`
  }
}

export const authLogout = async (idps?: string | null): Promise<void> => {
  if (idps) {
    window.location.href = `${_baseUrl}/api/auth/logout?idps=${idps}`
  } else {
    window.location.href = `${_baseUrl}/api/auth/logout`
  }
}

export const authResetPassword = async (): Promise<void> => {
  window.location.href = `${_baseUrl}/api/auth/reset-password`
}
