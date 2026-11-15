/* eslint-disable-next-line max-len */
export const isValidArrayString = (value: any) => {
  if (!value || value.length === 0) return false
  return value.length > 0
}

export const isValidEmail = (value: string) => {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  if (!value || value.length === 0) return false
  return regex.test(value)
}

export const isValidPassword = (value: string) => {
  if (!value || value.length === 0) return false
  return value.length >= 3 // If we need a min lengh => (return value.length >= 6)
}

export const isValidString = (value: string) => {
  if (!value || value.length === 0) return false
  return (value.trim()).length > 0
}

export const isValidLength = (value: string) => {
  if (value.length > 48) return false
  return true
}

export const isValidNumberGreaterThanZero = (value: any) => {
  return value > 0 && !isNaN(value)
}

export const isValidNumberGreaterEqualThanZero = (value: any) => {
  return value >= 0 && !isNaN(value)
}

export const isValidNumberLessThanSpecificMaxNumber = (value: number, max: number) => {
  return value < max && !isNaN(value)
}

export const isValidBaseRate = (value: number) => {
  return !isNaN(value)
}


export const isValidDomain = (value: string): boolean => {
  const regex = /^(?!www\.)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!value || value.length === 0) return false;
  return regex.test(value);
};



/**
 * AB#20378: Calculum's own domain. An address on it belongs to internal staff supporting the
 * account, never to a customer seat, so it is exempt from the company's allowed-domain
 * restriction and from the external-user limit. Mirrors AllowedDomainsHelper on the API.
 */
export const CALCULUM_DOMAIN = 'calculum.ai'

/**
 * AB#20378: is this an internal Calculum address? Anchored on the whole domain, so a look-alike
 * such as notcalculum.ai or calculum.ai.example.com is not mistaken for one.
 */
export const isCalculumEmail = (value?: string | null): boolean => {
  const domain = (value || '').trim().toLowerCase().split('@')[1]
  return domain === CALCULUM_DOMAIN
}

export const isValidEmailandAllowedDomains = (value: string, allowedDomains: string): boolean => {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (!value || value.length === 0 || !regex.test(value)) {
    return false;
  }

  const domain = value.split('@')[1];

  // AB#20378: Calculum staff are exempt from the customer's domain restriction. The format check
  // above still applies, so a malformed address is rejected whatever its domain.
  if (domain.toLowerCase() === CALCULUM_DOMAIN) {
    return true;
  }

  const allowedDomainsArray = allowedDomains.split(',').map(d => d.trim().toLowerCase());

  return allowedDomainsArray.includes(domain.toLowerCase());
};
