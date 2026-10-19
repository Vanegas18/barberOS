import type { LoginInput, PublicUser, RegisterInput } from "@barberos/contracts";
import { api } from "@/lib/api/client";

type UserResponse = { user: PublicUser };

export const authApi = {
  me: () => api<UserResponse>("/auth/me").then((r) => r.user),
  login: (input: LoginInput) =>
    api<UserResponse>("/auth/login", { method: "POST", body: input }).then((r) => r.user),
  register: (input: RegisterInput) =>
    api<UserResponse>("/auth/register", { method: "POST", body: input }).then((r) => r.user),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
};
