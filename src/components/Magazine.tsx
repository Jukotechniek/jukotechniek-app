import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MagazineArticle {
  id: string;
  part_number: string;
  part_name: string;
  description: string | null;
  category: string | null;
  stock_quantity: number;
  price: number | null;
  supplier: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

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

  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, [currentPage, searchTerm, selectedCategory]);

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

      // Apply search filter
      if (searchTerm) {
        query = query.or(`part_number.ilike.%${searchTerm}%,part_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setArticles(data || []);
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
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Uitverkocht', color: 'bg-red-100 text-red-800' };
    if (quantity < 10) return { label: 'Laag', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Op voorraad', color: 'bg-green-100 text-green-800' };
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-6 bg-gradient-to-br from-white via-gray-100 to-red-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-red-700 mb-1 md:mb-2 tracking-tight">
            Magazijn <span className="font-normal text-gray-700 text-base">• Onderdelen Catalogus</span>
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Zoek en bekijk beschikbare onderdelen en voorraadstatus.
          </p>
        </header>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {articles.map((article) => {
            const stockStatus = getStockStatus(article.stock_quantity);
            return (
              <Card key={article.id} className="shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-bold text-gray-900 mb-1">
                        {article.part_number}
                      </CardTitle>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        {article.part_name}
                      </h3>
                    </div>
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <Badge className={stockStatus.color}>
                    {stockStatus.label}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-2">
                  {article.description && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {article.description}
                    </p>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Voorraad:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {article.stock_quantity} stuks
                      </span>
                    </div>
                    {article.price && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Prijs:</span>
                        <span className="text-sm font-semibold text-green-600">
                          €{article.price.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {article.category && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Categorie:</span>
                        <span className="text-xs text-gray-700">{article.category}</span>
                      </div>
                    )}
                    {article.supplier && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Leverancier:</span>
                        <span className="text-xs text-gray-700">{article.supplier}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Vorige
                </Button>
                
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum ? "bg-red-600 hover:bg-red-700" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center"
                >
                  Volgende
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Magazine;
