import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { eventsApi } from '../services/api'
import type { Event } from '../types'

export const useEvents = (): UseQueryResult<Event[], Error> => {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await eventsApi.getAll()
      return response.data
    },
  })
}

export const useActiveEvents = (): UseQueryResult<Event[], Error> => {
  return useQuery({
    queryKey: ['events', 'active'],
    queryFn: async () => {
      const response = await eventsApi.getActive()
      return response.data
    },
  })
}

export const useMapEvents = (): UseQueryResult<Event[], Error> => {
  return useQuery({
    queryKey: ['events', 'map'],
    queryFn: async () => {
      const response = await eventsApi.getMapData()
      return response.data
    },
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  })
}

export const useEvent = (id: number | null): UseQueryResult<Event, Error> => {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const response = await eventsApi.getById(id!)
      return response.data
    },
    enabled: !!id,
  })
}
