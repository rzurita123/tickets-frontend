
const API_URL = 'https://localhost:7225';

export async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem('token');

  const headers = {
    ...options.headers,
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor.');
  }

  const data =
    response.status === 204
      ? null
      : await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.title || 'El servidor respondió con un error.'
    );
  }

  return data;
}
