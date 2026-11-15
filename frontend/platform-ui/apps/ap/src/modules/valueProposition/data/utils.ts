export function extractCleanJson(apiResponse: string | string[]) {
  // Convertir array a string si es necesario
  const responseString = Array.isArray(apiResponse) ? apiResponse.join('') : apiResponse;
  
  // Find the first { and the last }
  const start = responseString.indexOf("{");
  const end = responseString.lastIndexOf("}") + 1;

  if (start === -1 || end === 0) {
    console.error("No se encontró JSON válido en la respuesta");
    return null;
  }

  const cleanJson = responseString.slice(start, end);
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Error al parsear JSON:", e);
    return null;
  }
}
