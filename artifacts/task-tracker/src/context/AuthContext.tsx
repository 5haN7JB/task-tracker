import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: async () => {},
  refetchUser: async () => {},
});

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, role, created_at")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    createdAt: data.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      }
      setIsLoading(false);
    });

    // Subscribe to auth state changes (login, logout, token refresh, OAuth callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Mark loading BEFORE the async profile fetch so ProtectedRoute
      // shows a spinner instead of bouncing the user back to /login.
      setIsLoading(true);
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refetchUser = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      const profile = await fetchProfile(authUser.id);
      setUser(profile);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
