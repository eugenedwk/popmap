import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { businessesApi } from '../services/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  User,
  LogOut,
  Calendar,
  Edit,
  FileText,
  Settings,
  Eye,
  Building2,
  ChevronDown,
} from 'lucide-react'

export function BusinessAccountDropdown() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  // Fetch user's business
  const { data: businesses } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: async () => {
      const response = await businessesApi.getMyBusinesses()
      return response.data
    },
  })

  // Get the first (primary) business
  const business = businesses?.[0]

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/20 gap-2"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{user?.first_name || user?.email}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{user?.first_name} {user?.last_name}</span>
            <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {business ? (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              {business.name}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigate(`/business/${business.id}/dashboard`)}
              className="cursor-pointer"
            >
              <Calendar className="h-4 w-4 mr-2" />
              My Events
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`/business/${business.id}/dashboard?tab=profile`)}
              className="cursor-pointer"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`/business/${business.id}/dashboard?tab=forms`)}
              className="cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Forms
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`/business/${business.id}/dashboard?tab=settings`)}
              className="cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate(`/p/${business.id}`)}
              className="cursor-pointer"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Public Page
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            onClick={() => navigate('/onboarding/business')}
            className="cursor-pointer"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Set Up Your Business
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
