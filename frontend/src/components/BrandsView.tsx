import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { businessesApi, categoriesApi } from '../services/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Search,
  Building2,
  Globe,
  Instagram,
  Phone,
} from 'lucide-react';
import {
  formatPhoneNumber,
  extractDomain,
  extractInstagramUsername,
} from '@/lib/utils';
import type { Business, Category } from '../types';

interface BrandsViewProps {
  onBusinessClick?: (businessId: number) => void;
}

function BrandsView({ onBusinessClick }: BrandsViewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || ''
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all'
  );

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory);
    }
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, setSearchParams]);

  // Fetch businesses
  const {
    data: businesses,
    isLoading: businessesLoading,
    error: businessesError,
  } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const response = await businessesApi.getAll();
      // Handle paginated responses
      return Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
    },
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesApi.getAll();
      return Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
    },
  });

  // Filter businesses based on search and category
  const filteredBusinesses = useMemo(() => {
    if (!businesses || !Array.isArray(businesses)) return [];

    return businesses.filter((business) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        selectedCategory === 'all' ||
        business.categories?.some(
          (cat) => cat.id.toString() === selectedCategory
        );

      return matchesSearch && matchesCategory;
    });
  }, [businesses, searchQuery, selectedCategory]);

  const handleBusinessClick = (businessId: number) => {
    if (onBusinessClick) {
      onBusinessClick(businessId);
    } else {
      navigate(`/p/${businessId}`);
    }
  };

  if (businessesError) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Businesses
            </CardTitle>
            <CardDescription>
              {businessesError instanceof Error
                ? businessesError.message
                : 'Failed to load businesses'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Brands & Businesses</h1>
          <p className="text-muted-foreground">
            Discover {filteredBusinesses.length}{' '}
            {filteredBusinesses.length === 1 ? 'business' : 'businesses'}
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 space-y-4 md:space-y-0 md:flex md:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  categories?.map((category: Category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {businessesLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Business List */}
        {!businessesLoading && (
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {filteredBusinesses.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    {searchQuery || selectedCategory !== 'all'
                      ? 'No businesses found matching your filters.'
                      : 'No businesses found.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBusinesses.map((business: Business) => (
                  <Card
                    key={business.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleBusinessClick(business.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        {business.logo && (
                          <div className="flex-shrink-0">
                            <img
                              src={business.logo}
                              alt={`${business.name} logo`}
                              className="w-16 h-16 object-contain rounded-lg border border-border bg-card p-2"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2">
                            <CardTitle className="text-xl line-clamp-2">
                              {business.name}
                            </CardTitle>
                            {business.is_verified && (
                              <Badge
                                variant="default"
                                className="mt-1 flex-shrink-0"
                              >
                                Verified
                              </Badge>
                            )}
                          </div>
                          {business.categories &&
                            business.categories.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap mb-2">
                                {business.categories.map((category) => (
                                  <Badge
                                    key={category.id}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {category.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {business.description && (
                        <CardDescription className="line-clamp-2 mb-4">
                          {business.description}
                        </CardDescription>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm">
                        {business.website && (
                          <a
                            href={business.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Globe className="h-4 w-4" />
                            <span className="truncate max-w-[200px]">
                              {extractDomain(business.website)}
                            </span>
                          </a>
                        )}
                        {business.instagram_url && (
                          <a
                            href={business.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Instagram className="h-4 w-4" />
                            <span>
                              {extractInstagramUsername(business.instagram_url)}
                            </span>
                          </a>
                        )}
                        {business.contact_phone && (
                          <a
                            href={`tel:${business.contact_phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                            <span>
                              {formatPhoneNumber(business.contact_phone)}
                            </span>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

export default BrandsView;
