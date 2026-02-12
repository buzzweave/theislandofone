const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem("admin_token");
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...customHeaders,
    };
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      localStorage.removeItem("admin_token");
      throw new Error("Session expired. Please log in again.");
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errBody.message || errBody.error || `Request failed (${res.status})`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get<T = any>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T = any>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }

  put<T = any>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }

  delete<T = any>(path: string) {
    return this.request<T>("DELETE", path);
  }

  async upload<T = any>(path: string, file: File, fieldName = "file"): Promise<T> {
    const form = new FormData();
    form.append(fieldName, file);
    return this.request<T>("POST", path, form);
  }

  async uploadMultiple<T = any>(path: string, files: Record<string, File>): Promise<T> {
    const form = new FormData();
    for (const [key, file] of Object.entries(files)) {
      form.append(key, file);
    }
    return this.request<T>("POST", path, form);
  }

  setToken(token: string) {
    localStorage.setItem("admin_token", token);
  }

  clearToken() {
    localStorage.removeItem("admin_token");
  }

  hasToken(): boolean {
    return !!this.getToken();
  }
}

export const api = new ApiClient();
