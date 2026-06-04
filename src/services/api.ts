import axios from 'axios';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
      }
    }

    // Enhance error messages for better UX
    if (error.code === 'ECONNABORTED') {
      error.userMessage = 'La requête a dépassé le délai imparti. Veuillez réessayer.';
    } else if (!error.response) {
      error.userMessage = 'Connexion impossible. Vérifiez votre connexion Internet.';
    } else if (error.response.status >= 500) {
      error.userMessage = 'Erreur serveur. Veuillez réessayer dans quelques instants.';
    } else if (error.response.status === 429) {
      error.userMessage = 'Trop de requêtes. Veuillez attendre quelques secondes.';
    }

    return Promise.reject(error);
  }
);
