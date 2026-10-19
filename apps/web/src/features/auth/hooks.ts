import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "./api";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useMe() {
  return useQuery({ queryKey: authKeys.me, queryFn: authApi.me, retry: false });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => queryClient.setQueryData(authKeys.me, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (user) => queryClient.setQueryData(authKeys.me, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logout,
    // Aunque la API falle, el usuario quiere salir: navegamos y borramos la caché igual.
    onSettled: () => {
      router.replace("/ingresar");
      queryClient.clear();
    },
  });
}
