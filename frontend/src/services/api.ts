import axios, { type AxiosResponse } from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { Category, Business, Event, BusinessFormData, EventFormData, ApiResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add authentication token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // User is not authenticated, continue without token
      console.debug('No auth token available');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses (token expired or invalid)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed - token may be expired');
      // Could trigger a re-authentication flow here
    }
    return Promise.reject(error);
  }
);

// Export apiClient for use in AuthContext
export { apiClient };

export const categoriesApi = {
  getAll: (): Promise<AxiosResponse<Category[]>> => apiClient.get('/categories/'),
}

export const businessesApi = {
  getAll: (): Promise<AxiosResponse<Business[]>> => apiClient.get('/businesses/'),
  getById: (id: number): Promise<AxiosResponse<Business>> => apiClient.get(`/businesses/${id}/`),
  create: (data: BusinessFormData): Promise<AxiosResponse<ApiResponse<Business>>> => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      const value = data[key as keyof BusinessFormData]
      if (key === 'logo' && value) {
        formData.append(key, value as File)
      } else if (key === 'category_ids' && Array.isArray(value)) {
        value.forEach((id: number) => formData.append('category_ids', id.toString()))
      } else if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value as string)
      }
    })
    return apiClient.post('/businesses/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

export const eventsApi = {
  getAll: (): Promise<AxiosResponse<Event[]>> => apiClient.get('/events/'),
  getActive: (): Promise<AxiosResponse<Event[]>> => apiClient.get('/events/active/'),
  getMapData: (): Promise<AxiosResponse<Event[]>> => apiClient.get('/events/map_data/'),
  getById: (id: number): Promise<AxiosResponse<Event>> => apiClient.get(`/events/${id}/`),
  create: (data: EventFormData): Promise<AxiosResponse<ApiResponse<Event>>> => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      const value = data[key as keyof EventFormData]
      if (key === 'image' && value) {
        formData.append(key, value as File)
      } else if (key === 'business_ids' && Array.isArray(value)) {
        value.forEach((id: number) => formData.append('business_ids', id.toString()))
      } else if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value as string)
      }
    })
    return apiClient.post('/events/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  joinEvent: (eventId: number, businessId: number): Promise<AxiosResponse<{ message: string; event_id: number; business_id: number }>> =>
    apiClient.post(`/events/${eventId}/join/`, { business_id: businessId }),
  leaveEvent: (eventId: number, businessId: number): Promise<AxiosResponse<{ message: string; event_id: number; business_id: number }>> =>
    apiClient.post(`/events/${eventId}/leave/`, { business_id: businessId }),
}

export default apiClient
