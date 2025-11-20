import axios, { type AxiosResponse } from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'
import type {
  Category,
  Business,
  Event,
  BusinessFormData,
  EventFormData,
  ApiResponse,
  SubscriptionPlan,
  Subscription,
  CreateCheckoutSessionRequest,
  CheckoutSessionResponse,
  FormTemplate,
  FormField,
  FormSubmission,
  FormSubmissionRequest,
  FormTemplateFormData
} from '../types'

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
    return apiClient.post('/businesses/', formData)
  },
  update: (id: number, data: Partial<Business>): Promise<AxiosResponse<Business>> =>
    apiClient.patch(`/businesses/${id}/`, data),
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
    return apiClient.post('/events/', formData)
  },
  joinEvent: (eventId: number, businessId: number): Promise<AxiosResponse<{ message: string; event_id: number; business_id: number }>> =>
    apiClient.post(`/events/${eventId}/join/`, { business_id: businessId }),
  leaveEvent: (eventId: number, businessId: number): Promise<AxiosResponse<{ message: string; event_id: number; business_id: number }>> =>
    apiClient.post(`/events/${eventId}/leave/`, { business_id: businessId }),
  rsvp: (eventId: number, status: 'interested' | 'going'): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/events/${eventId}/rsvp/`, { status }),
  cancelRsvp: (eventId: number): Promise<AxiosResponse<{ message: string }>> =>
    apiClient.delete(`/events/${eventId}/cancel_rsvp/`),
  getMyRsvps: (): Promise<AxiosResponse<any[]>> =>
    apiClient.get('/events/my_rsvps/'),
}

export const billingApi = {
  getPlans: (): Promise<AxiosResponse<SubscriptionPlan[]>> =>
    apiClient.get('/billing/plans/'),

  getCurrentSubscription: (): Promise<AxiosResponse<{ subscription: Subscription | null; message?: string }>> =>
    apiClient.get('/billing/subscription/current/'),

  createCheckoutSession: (data: CreateCheckoutSessionRequest): Promise<AxiosResponse<CheckoutSessionResponse>> =>
    apiClient.post('/billing/subscription/create_checkout_session/', data),

  cancelSubscription: (cancelAtPeriodEnd: boolean = true): Promise<AxiosResponse<{ message: string; cancel_at_period_end: boolean }>> =>
    apiClient.post('/billing/subscription/cancel/', {
      cancel_at_period_end: cancelAtPeriodEnd
    }),
}

// Forms API
export const formsApi = {
  // Form Templates
  getTemplates: (): Promise<AxiosResponse<FormTemplate[]>> =>
    apiClient.get('/forms/templates/'),

  getTemplateById: (id: number): Promise<AxiosResponse<FormTemplate>> =>
    apiClient.get(`/forms/templates/${id}/`),

  createTemplate: (data: FormTemplateFormData): Promise<AxiosResponse<FormTemplate>> =>
    apiClient.post('/forms/templates/', data),

  updateTemplate: (id: number, data: Partial<FormTemplateFormData>): Promise<AxiosResponse<FormTemplate>> =>
    apiClient.patch(`/forms/templates/${id}/`, data),

  deleteTemplate: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/forms/templates/${id}/`),

  // Form Fields
  createField: (data: Partial<FormField>): Promise<AxiosResponse<FormField>> =>
    apiClient.post('/forms/fields/', data),

  updateField: (id: number, data: Partial<FormField>): Promise<AxiosResponse<FormField>> =>
    apiClient.patch(`/forms/fields/${id}/`, data),

  deleteField: (id: number): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/forms/fields/${id}/`),

  // Form Submissions
  submitForm: (templateId: number, data: FormSubmissionRequest): Promise<AxiosResponse<{ message: string; submission_id: number }>> =>
    apiClient.post(`/forms/templates/${templateId}/submit/`, data),

  getSubmissions: (templateId: number): Promise<AxiosResponse<FormSubmission[]>> =>
    apiClient.get(`/forms/templates/${templateId}/submissions/`),
}

export default apiClient
