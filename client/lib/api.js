const API_URL = process.env.NEXT_PUBLIC_API_URL;

function buildQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function request(path, params) {
  const res = await fetch(`${API_URL}${path}${buildQueryString(params)}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json();
}

export async function getHistorical(params) {
  return request('/api/historical', params);
}

export async function getSpecialties() {
  return request('/api/historical/specialties');
}

export async function getNeighborhoods() {
  return request('/api/historical/neighborhoods');
}

export async function getPredictions(params) {
  return request('/api/predictions', params);
}

export async function getAlerts(params) {
  return request('/api/alerts', params);
}
