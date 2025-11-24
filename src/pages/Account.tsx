import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  CreditCard, 
  User, 
  Settings, 
  Shield, 
  Languages, 
  Moon, 
  HelpCircle, 
  Info, 
  LogOut,
  ChevronRight,
  Edit2,
  BookOpen
} from "lucide-react";
import logo from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";
import kutaraMabukuIcon from "@/assets/scribook-icon.jpg";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  full_name: string;
  email: string;
  avatar_url?: string;
}

const Account = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const menuItems = [
    { 
      icon: CreditCard, 
      label: "Métodos de Pagamento", 
      bgColor: "bg-green-100 dark:bg-green-900/30", 
      iconColor: "text-green-600 dark:text-green-400" 
    },
    { 
      icon: User, 
      label: "Informações Pessoais", 
      bgColor: "bg-blue-100 dark:bg-blue-900/30", 
      iconColor: "text-blue-600 dark:text-blue-400" 
    },
    { 
      icon: Settings, 
      label: "Preferências", 
      bgColor: "bg-purple-100 dark:bg-purple-900/30", 
      iconColor: "text-purple-600 dark:text-purple-400" 
    },
    { 
      icon: Shield, 
      label: "Segurança", 
      bgColor: "bg-green-100 dark:bg-green-900/30", 
      iconColor: "text-green-600 dark:text-green-400" 
    },
    { 
      icon: Languages, 
      label: "Idioma", 
      bgColor: "bg-orange-100 dark:bg-orange-900/30", 
      iconColor: "text-primary",
      value: "Português (BR)" 
    },
  ];

  const additionalItems = [
    { 
      icon: HelpCircle, 
      label: "Central de Ajuda", 
      bgColor: "bg-green-100 dark:bg-green-900/30", 
      iconColor: "text-green-600 dark:text-green-400" 
    },
    { 
      icon: Info, 
      label: "Sobre Kutara Mabuku", 
      bgColor: "bg-orange-100 dark:bg-orange-900/30", 
      iconColor: "text-primary"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={theme === "dark" ? logoDark : logo} alt="Kutara Mabuku" className="w-10 h-10 rounded-lg" />
            <h1 className="text-2xl font-bold">Conta</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Profile Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-primary text-white text-xl">
                  {profile?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{profile?.full_name || "Usuário"}</h2>
                <p className="text-sm text-muted-foreground">{profile?.email || ""}</p>
              </div>
            </div>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Edit2 className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </Card>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item, index) => (
            <Card key={index} className="p-4 hover:shadow-card transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${item.bgColor} flex items-center justify-center`}>
                    <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && <span className="text-sm text-muted-foreground">{item.value}</span>}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>
          ))}

          {/* Dark Mode Toggle */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Moon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium">Modo Escuro</span>
              </div>
              <Switch 
                checked={theme === "dark"} 
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
              />
            </div>
          </Card>
        </div>

        {/* Additional Items */}
        <div className="space-y-2">
          {additionalItems.map((item, index) => (
            <Card key={index} className="p-4 hover:shadow-card transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${item.bgColor} flex items-center justify-center`}>
                    <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>

        {/* Logout Button */}
        <Card 
          className="p-4 hover:shadow-card transition-shadow cursor-pointer border-destructive/20"
          onClick={handleLogout}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <LogOut className="h-6 w-6 text-destructive" />
              </div>
              <span className="font-medium text-destructive">Sair</span>
            </div>
          </div>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Account;
