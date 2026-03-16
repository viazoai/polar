import { useEffect, useState } from "react";

interface User {
  id: number;
  name: string;
  login_id: string;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type { User };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true, isAuthenticated: false });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("unauth");
        return res.json();
      })
      .then((user: User) => setState({ user, isLoading: false, isAuthenticated: true }))
      .catch(() => setState({ user: null, isLoading: false, isAuthenticated: false }));
  }, []);

  return state;
}
