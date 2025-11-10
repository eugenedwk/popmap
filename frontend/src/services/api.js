import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const categoriesApi = {
  getAll: () => apiClient.get('/categories/'),
}

export const businessesApi = {
  getAll: () => apiClient.get('/businesses/'),
  getById: (id) => apiClient.get(`/businesses/${id}/`),
  create: (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (key === 'logo' && data[key]) {
        formData.append(key, data[key])
      } else if (key === 'category_ids' && Array.isArray(data[key])) {
        data[key].forEach(id => formData.append('category_ids', id))
      } else if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        formData.append(key, data[key])
      }
    })
    return apiClient.post('/businesses/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

export const eventsApi = {
  getAll: () => apiClient.get('/events/'),
  getActive: () => apiClient.get('/events/active/'),
  getMapData: () => apiClient.get('/events/map_data/'),
  getById: (id) => apiClient.get(`/events/${id}/`),
  create: (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (key === 'image' && data[key]) {
        formData.append(key, data[key])
      } else if (key === 'business_ids' && Array.isArray(data[key])) {
        data[key].forEach(id => formData.append('business_ids', id))
      } else if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        formData.append(key, data[key])
      }
    })
    return apiClient.post('/events/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

export default apiClient
