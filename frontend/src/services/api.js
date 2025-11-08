import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const eventsApi = {
  getAll: () => apiClient.get('/events/'),
  getActive: () => apiClient.get('/events/active/'),
  getMapData: () => apiClient.get('/events/map_data/'),
  getById: (id) => apiClient.get(`/events/${id}/`),
}

export const businessesApi = {
  getAll: () => apiClient.get('/businesses/'),
  getById: (id) => apiClient.get(`/businesses/${id}/`),
}

export default apiClient
