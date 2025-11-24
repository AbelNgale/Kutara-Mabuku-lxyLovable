import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Search, SlidersHorizontal } from "lucide-react";
import logo from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";
import BottomNav from "@/components/BottomNav";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Genre {
  id: string;
  name: string;
}

interface Ebook {
  id: string;
  title: string;
  description?: string;
  author?: string;
  cover_image?: string;
  genre?: string;
  price?: number;
  pages?: number;
  formats?: string[];
  published_at?: string;
  rating?: number;
  downloads?: number;
  preview_content?: string;
  user_id: string;
  created_at?: string;
}

const Discover = () => {
  const { theme } = useTheme();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [books, setBooks] = useState<Ebook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterPrice, setFilterPrice] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchGenres();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchBooks();
    }
  }, [currentUserId]);

  useEffect(() => {
    applyFilters();
  }, [books, selectedGenre, searchQuery, sortBy, filterPrice, filterRating]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchGenres = async () => {
    const { data } = await supabase.from("genres").select("*").order("name");
    if (data) setGenres(data);
  };

  const fetchBooks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ebooks")
      .select("*")
      .or(`is_public.eq.true,user_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (data) {
      setBooks(data);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...books];

    // Genre filter
    if (selectedGenre !== "all") {
      filtered = filtered.filter((book) => book.genre === selectedGenre);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Price filter
    if (filterPrice === "free") {
      filtered = filtered.filter((book) => book.price === 0);
    } else if (filterPrice === "paid") {
      filtered = filtered.filter((book) => (book.price || 0) > 0);
    }

    // Rating filter
    if (filterRating !== "all") {
      const minRating = parseInt(filterRating);
      filtered = filtered.filter((book) => (book.rating || 0) >= minRating);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "alphabetical-reverse":
          return b.title.localeCompare(a.title);
        case "recent":
          return new Date(b.published_at || b.created_at).getTime() - 
                 new Date(a.published_at || a.created_at).getTime();
        case "oldest":
          return new Date(a.published_at || a.created_at).getTime() - 
                 new Date(b.published_at || b.created_at).getTime();
        case "popular":
          return (b.downloads || 0) - (a.downloads || 0);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    // Priorizar livros de outros usuários quando não há pesquisa
    if (!searchQuery && currentUserId) {
      filtered.sort((a, b) => {
        const aIsOwn = a.user_id === currentUserId;
        const bIsOwn = b.user_id === currentUserId;
        
        if (aIsOwn && !bIsOwn) return 1;
        if (!aIsOwn && bIsOwn) return -1;
        return 0;
      });
    }

    setFilteredBooks(filtered);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src={theme === "dark" ? logoDark : logo} alt="Kutara Mabuku" className="w-10 h-10" />
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Kutara Mabuku
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar livros ou autores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-24">
        {/* Genre Filter */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Explorar por Género</h2>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedGenre === "all" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => setSelectedGenre("all")}
            >
              Todos
            </Badge>
            {genres.map((genre) => (
              <Badge
                key={genre.id}
                variant={selectedGenre === genre.name ? "default" : "outline"}
                className="cursor-pointer px-4 py-2"
                onClick={() => setSelectedGenre(genre.name)}
              >
                {genre.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais Recentes</SelectItem>
                <SelectItem value="oldest">Mais Antigos</SelectItem>
                <SelectItem value="alphabetical">A-Z</SelectItem>
                <SelectItem value="alphabetical-reverse">Z-A</SelectItem>
                <SelectItem value="popular">Mais Populares</SelectItem>
                <SelectItem value="rating">Melhor Avaliados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPrice} onValueChange={setFilterPrice}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Preço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="free">Grátis</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Avaliação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Avaliação</SelectItem>
                <SelectItem value="5">★★★★★ (5)</SelectItem>
                <SelectItem value="4">★★★★☆ (4+)</SelectItem>
                <SelectItem value="3">★★★☆☆ (3+)</SelectItem>
                <SelectItem value="2">★★☆☆☆ (2+)</SelectItem>
                <SelectItem value="1">★☆☆☆☆ (1+)</SelectItem>
              </SelectContent>
            </Select>

            {(selectedGenre !== "all" || searchQuery || filterPrice !== "all" || filterRating !== "all" || sortBy !== "recent") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedGenre("all");
                  setSearchQuery("");
                  setSortBy("recent");
                  setFilterPrice("all");
                  setFilterRating("all");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{filteredBooks.length}</span>
            <span>{filteredBooks.length === 1 ? "livro encontrado" : "livros encontrados"}</span>
          </div>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh]">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Nenhum livro encontrado</h2>
            <p className="text-muted-foreground text-center">
              Tente ajustar os filtros ou pesquisa
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author || "Autor Desconhecido"}
                coverImage={book.cover_image}
                description={book.description}
                genre={book.genre}
                price={book.price}
                downloads={book.downloads}
                pages={book.pages}
                formats={book.formats}
                publishedAt={book.published_at}
                rating={book.rating}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Discover;
