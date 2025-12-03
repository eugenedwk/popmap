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
  FormTemplateFormData,
  GuestRSVPFormData,
  GuestRSVPCheckResponse,
  EventRSVP
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Flag to prevent auto-signout during OAuth callback
let isProcessingCallback = false
export const setProcessingCallback = (value: boolean) => { isProcessingCallback = value }

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add authentication token to all requests
// Use ID token instead of access token to get custom attributes like user_role
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      // ID token contains custom attributes (custom:user_role), access token doesn't
      const token = session.tokens?.idToken?.toString();

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

// Handle 401/403 responses (token expired or invalid)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Skip auto-signout during OAuth callback processing
    if (isProcessingCallback) {
      console.debug('Skipping auto-signout during callback processing');
      return Promise.reject(error);
    }

    // Only clear session if we sent a token and got 401/403
    const hadAuthToken = error.config?.headers?.Authorization;
    const isAuthError = error.response?.status === 401 || error.response?.status === 403;

    if (hadAuthToken && isAuthError) {
      console.error('Authentication failed - token may be expired or invalid');
      // If we sent a token but got 401/403, the token is invalid
      // Clear the session to stop sending bad tokens
      try {
        const { signOut } = await import('aws-amplify/auth');
        await signOut({ global: false });
        console.log('Cleared invalid session');
        // Reload to show logged out state
        window.location.reload();
      } catch (e) {
        console.debug('Could not clear session:', e);
      }
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
  getBySubdomain: (subdomain: string): Promise<AxiosResponse<Business>> => apiClient.get(`/businesses/by-subdomain/${subdomain}/`),
  getMyBusinesses: (): Promise<AxiosResponse<Business[]>> => apiClient.get('/businesses/my_businesses/'),
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
    // Let axios set the Content-Type header automatically (includes boundary for multipart)
    return apiClient.post('/businesses/', formData, {
      headers: { 'Content-Type': undefined }
    })
  },
  update: (id: number, data: Partial<Business>): Promise<AxiosResponse<Business>> =>
    apiClient.patch(`/businesses/${id}/`, data),
}

export const eventsApi = {
  getAll: (): Promise<AxiosResponse<Event[]>> => apiClient.get('/events/'),
  getActive: (): Promise<AxiosResponse<Event[]>> => apiClient.get('/events/active/'),
  getMapData: (): Promise<AxiosResponse<Event[]>> => apiClient.get('/events/map_data/'),
  getById: (id: number): Promise<AxiosResponse<Event>> => apiClient.get(`/events/${id}/`),
  getMyEvents: (): Promise<AxiosResponse<Event[]>> => apiClient.get('/events/my_events/'),
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
    // Let axios set the Content-Type header automatically (includes boundary for multipart)
    return apiClient.post('/events/', formData, {
      headers: { 'Content-Type': undefined }
    })
  },
  update: (id: number, data: Partial<EventFormData>): Promise<AxiosResponse<Event>> => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      const value = data[key as keyof Partial<EventFormData>]
      if (key === 'image' && value) {
        formData.append(key, value as File)
      } else if (key === 'business_ids' && Array.isArray(value)) {
        value.forEach((id: number) => formData.append('business_ids', id.toString()))
      } else if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value as string)
      }
    })
    return apiClient.patch(`/events/${id}/`, formData)
  },
  joinEvent: (eventId: number, businessId: number): Promise<AxiosResponse<{ message: string; event_id: number; business_id: number }>> =>
    apiClient.post(`/events/${eventId}/join/`, { business_id: businessId }),
  leaveEvent: (eventId: number, businessId: number): Promise<AxiosResponse<{ message: string; event_id: number; business_id: number }>> =>
    apiClient.post(`/events/${eventId}/leave/`, { business_id: businessId }),
  // Authenticated user RSVP
  rsvp: (eventId: number, status: 'interested' | 'going'): Promise<AxiosResponse<ApiResponse<EventRSVP>>> =>
    apiClient.post(`/events/${eventId}/rsvp/`, { status }),
  cancelRsvp: (eventId: number): Promise<AxiosResponse<{ message: string }>> =>
    apiClient.delete(`/events/${eventId}/cancel_rsvp/`),
  getMyRsvps: (): Promise<AxiosResponse<EventRSVP[]>> =>
    apiClient.get('/events/my_rsvps/'),

  // Guest RSVP (no authentication required)
  guestRsvp: (eventId: number, data: GuestRSVPFormData): Promise<AxiosResponse<ApiResponse<EventRSVP>>> =>
    apiClient.post(`/events/${eventId}/guest_rsvp/`, data),
  cancelGuestRsvp: (eventId: number, guestEmail: string): Promise<AxiosResponse<{ message: string }>> =>
    apiClient.post(`/events/${eventId}/cancel_guest_rsvp/`, { guest_email: guestEmail }),
  checkGuestRsvp: (eventId: number, email: string): Promise<AxiosResponse<GuestRSVPCheckResponse>> =>
    apiClient.get(`/events/${eventId}/check_guest_rsvp/`, { params: { email } }),
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
