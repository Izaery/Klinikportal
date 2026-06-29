// API-Client für lokalen PostgreSQL-Server
// Ersetzt den Supabase-Client für Standalone-Betrieb

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token-Verwaltung
let authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

// Generische Fetch-Funktion mit Auth-Header
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Ein Fehler ist aufgetreten' };
    }

    return { data, error: null };
  } catch (error) {
    console.error('API error:', error);

    // Heuristiken für typische Ursachen
    if (typeof window !== 'undefined') {
      const pageIsHttps = window.location.protocol === 'https:';
      const apiIsHttp = API_BASE_URL.startsWith('http://');
      if (pageIsHttps && apiIsHttp) {
        return {
          data: null,
          error:
            'Netzwerkfehler: Diese Seite läuft über HTTPS, aber das Backend ist HTTP (Mixed Content). Nutze HTTPS fürs Backend oder rufe das Frontend per HTTP auf.',
        };
      }

      const apiIsLocalhost = /localhost|127\.0\.0\.1/i.test(API_BASE_URL);
      const pageIsLocalhost = /localhost|127\.0\.0\.1/i.test(window.location.hostname);
      if (apiIsLocalhost && !pageIsLocalhost) {
        return {
          data: null,
          error:
            'Netzwerkfehler: Backend-URL ist localhost, aber du öffnest das Frontend nicht auf localhost. Nutze die Server-IP/Domain in VITE_API_URL.',
        };
      }
    }

    return {
      data: null,
      error: 'Netzwerkfehler - Server nicht erreichbar (prüfe Port/FW, CORS_ORIGIN und URL)',
    };
  }
}

// Auth API
export const authApi = {
  async login(username: string, password: string) {
    const result = await fetchWithAuth<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (result.data?.token) {
      setAuthToken(result.data.token);
    }
    
    return result;
  },

  async getCurrentUser() {
    return fetchWithAuth<any>('/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return fetchWithAuth<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  logout() {
    setAuthToken(null);
  },
};

// Patients API
export const patientsApi = {
  async getAll() {
    return fetchWithAuth<any[]>('/patients');
  },

  async getById(id: string) {
    return fetchWithAuth<any>(`/patients/${id}`);
  },

  async create(data: any) {
    return fetchWithAuth<any>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any) {
    return fetchWithAuth<any>(`/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return fetchWithAuth<{ success: boolean }>(`/patients/${id}`, {
      method: 'DELETE',
    });
  },

  async addContact(id: string, content: string) {
    return fetchWithAuth<any>(`/patients/${id}/contacts`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

// Users API (Admin)
export const usersApi = {
  async getAll() {
    return fetchWithAuth<any[]>('/users');
  },

  async create(data: { username: string; password: string; displayName?: string; roles?: string[] }) {
    return fetchWithAuth<{ success: boolean; userId: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRoles(userId: string, roles: string[]) {
    return fetchWithAuth<{ success: boolean }>(`/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    });
  },

  async resetPassword(userId: string, newPassword: string) {
    return fetchWithAuth<{ success: boolean }>(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  async delete(userId: string) {
    return fetchWithAuth<{ success: boolean }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async getProfiles() {
    return fetchWithAuth<any[]>('/users/profiles');
  },
};
