// API Configuration
const API_BASE_URL = '/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('auth_token', token);
    else localStorage.removeItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
    if (options.headers) Object.assign(headers, options.headers);
    const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
    if (response.status === 401) { this.setToken(null); throw new Error('Unauthorized'); }
    return response.json();
  }

  get(endpoint: string): Promise<any> { return this.request(endpoint, { method: 'GET' }); }
  post(endpoint: string, data?: any): Promise<any> { return this.request(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }); }
  put(endpoint: string, data?: any): Promise<any> { return this.request(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }); }
  delete(endpoint: string): Promise<any> { return this.request(endpoint, { method: 'DELETE' }); }
}

export const api = new ApiClient(API_BASE_URL);
export const apiClient = api;
