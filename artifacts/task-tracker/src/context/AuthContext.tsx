import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey, useLogout } from "@workspace/api-client-react";

interface User {
  id: number;
  email: string;
  name: string;
  role: "manager" | "employee";
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: () => {},
  refetchUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  const { data, isLoading, refetch } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (data) {
      setUser(data as User);
    } else if (!isLoading) {
      setUser(null);
    }
  }, [data, isLoading]);

  const logoutMutation = useLogout();

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        setUser(null);
        queryClient.clear();
      },
    });
  };

  const refetchUser = () => {
    refetch().then((res) => {
      if (res.data) setUser(res.data as User);
    });
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
