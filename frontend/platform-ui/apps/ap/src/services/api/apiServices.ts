export const getUrlWithQueryParams = (url: string, params: any) => {
  let result = url

  if (params && params.length > 0) {
    params.forEach((item: any) => {
      // Value is array
      if (isQueryArray(item.value)) {
        item.value.forEach((itemArray: any) => {
          result = result.includes('?') ? `${result}&${item.query}${itemArray}` : `${result}?${item.query}${itemArray}`
        })
      }

      // Value is number or string
      if (isQueryNumber(item.value) || isQueryString(item.value)) {
        result = result.includes('?') ? `${result}&${item.query}${item.value}` : `${result}?${item.query}${item.value}`
      }
    })
  }

  return result
}

const isQueryArray = (arg: any) => arg && arg.length > 0 && Array.isArray(arg)

const isQueryNumber = (arg: any) => arg && typeof arg === 'number' && arg > 0

const isQueryString = (arg: any) => arg && typeof arg === 'string' && arg.length > 0
