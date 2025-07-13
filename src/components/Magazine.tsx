import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Package, ChevronLeft, ChevronRight, MapPin, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageLayout } from '@/components/ui/page-layout';

interface MagazineArticle {
  id: string;
  part_number: string;
  part_name: string;
  description: string | null;
  category: string | null;
  stock_quantity: number;
  price: number | null;
  supplier: string | null;
  Location: string | null;
  Magazine_name: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

const getPaginationRange = (currentPage: number, totalPages: number) => {
  const delta = 2; // Hoeveel knoppen rondom de huidige pagina zichtbaar
  const range = [];
  let left = Math.max(2, currentPage - delta);
  let right = Math.min(totalPages - 1, currentPage + delta);

  if (currentPage - delta <= 2) {
    right = Math.min(totalPages - 1, 1 + 2 * delta);
  }
  if (currentPage + delta >= totalPages - 1) {
    left = Math.max(2, totalPages - 2 * delta);
  }

  for (let i = left; i <= right; i++) {
    range.push(i);
  }

  if (left > 2) {
    range.unshift('...');
  }
  if (right < totalPages - 1) {
    range.push('...');
  }

  // Altijd eerste en laatste pagina tonen als er meer dan 1 pagina is
  if (totalPages > 1) {
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
  }

  // Unieke en juiste volgorde
  return Array.from(new Set(range.filter(v => typeof v === 'number' ? v > 0 && v <= totalPages : true)));
};

const Magazine: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [articles, setArticles] = useState<MagazineArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const itemsPerPage = 20;

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchArticles();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, [currentPage]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('magazine_articles')
        .select('category')
        .not('category', 'is', null);
      
      if (error) throw error;
      
      const uniqueCategories = [...new Set(data?.map(item => item.category).filter(Boolean) || [])];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('magazine_articles')
        .select('*', { count: 'exact' })
        .order('part_number');

      if (searchTerm) {
        query = query.or(`part_number.ilike.%${searchTerm}%,part_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const mappedData: MagazineArticle[] = (data || []).map(item => ({
        ...item,
        Location: item.Location || null,
        Magazine_name: item.Magazine_name || null,
      }));

      setArticles(mappedData);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };

  if (loading && articles.length === 0) {
    return (
      <PageLayout title="Magazijn" subtitle="Onderdelen Catalogus">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Magazijn" 
      subtitle="Zoek en bekijk beschikbare onderdelen en voorraadstatus."
    >
      {/* Search and Filter Controls */}
      <Card className="mb-6 shadow-lg border-2 border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Zoek op onderdeelnummer, naam of beschrijving..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle categorieën" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle categorieën</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Info */}
      <div className="mb-4 text-sm text-gray-600">
        {totalCount} onderdelen gevonden - Pagina {currentPage} van {totalPages}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        {articles.map((article) => (
          <Card key={article.id} className="shadow-xl border border-gray-200 hover:shadow-2xl transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base font-extrabold text-gray-900 mb-0 leading-tight">
                    {article.part_number}
                  </CardTitle>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1 leading-tight">
                    {article.part_name}
                  </h3>
                  {article.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{article.description}</p>
                  )}
                </div>
                <div>
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
              </div>
            </CardHeader>
            {article.image_url && (
              <div className="flex justify-center mb-2">
                <img
                  src={article.image_url}
                  alt={article.part_name || ''}
                  className="rounded-md object-contain h-24 max-w-full border"
                  style={{ background: "#f6f6f6" }}
                  loading="lazy"
                />
              </div>
            )}
            <CardContent className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold
                    ${article.stock_quantity < 2
                      ? 'bg-red-100 text-red-600'
                      : article.stock_quantity < 5
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                    }`}
                >
                  {article.stock_quantity} stuks
                </span>
                {article.price && (
                  <span className="ml-auto text-xs text-green-700 font-bold bg-green-50 px-2 py-1 rounded">
                    €{article.price.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center text-xs text-gray-500 mb-1">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="font-semibold mr-2">Locatie:</span>
                <span className="text-gray-700">{article.Location || '—'}</span>
              </div>
              <div className="flex items-center text-xs text-gray-500 mb-1">
                <Building className="h-3 w-3 mr-1" />
                <span className="font-semibold mr-2">Magazijn:</span>
                <span className="text-gray-700">{article.Magazine_name || '—'}</span>
              </div>
              {article.category && (
                <div className="flex items-center text-xs text-gray-500 mb-1">
                  <span className="font-semibold mr-2">Categorie:</span>
                  <span className="text-gray-700">{article.category}</span>
                </div>
              )}
              {article.supplier && (
                <div className="flex items-center text-xs text-gray-500 mb-1">
                  <span className="font-semibold mr-2">Leverancier:</span>
                  <span className="text-gray-700">{article.supplier}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {articles.length === 0 && !loading && (
        <Card className="shadow-lg border-2 border-gray-200">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Geen onderdelen gevonden
            </h3>
            <p className="text-gray-600">
              Probeer je zoekopdracht aan te passen of een andere categorie te selecteren.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="shadow-lg border-2 border-gray-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-center w-full gap-1 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center min-w-[34px] px-1 py-2 sm:px-2 sm:py-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPaginationRange(currentPage, totalPages).map((page, idx) =>
                page === '...' ? (
                  <span key={idx} className="px-1 text-gray-400">...</span>
                ) : (
                  <Button
                    key={page as number}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page as number)}
                    className={`min-w-[32px] px-2 ${currentPage === page ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                  >
                    {page}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center min-w-[34px] px-1 py-2 sm:px-2 sm:py-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
};

export default Magazine;
