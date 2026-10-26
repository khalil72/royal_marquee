"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Crown, Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { authApi } from "@/lib/api";
import { loginSchema, type LoginValues } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });

  // The store's logout() lands here with ?signedOut=1
  useEffect(() => {
    if (params.get("signedOut")) {
      toast.success("You have been signed out");
      router.replace("/login");
    }
  }, [params, router]);

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    const result = await authApi.login(values);
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(`Welcome back, ${result.data.username}`);
    // Only follow same-site relative paths
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    router.refresh();
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-br from-primary/10 via-background to-gold/10 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Crown className="size-7" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Marquee Booking Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage bookings and payments</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <FormField label="Username" htmlFor="username" error={errors.username?.message}>
            <Input id="username" autoComplete="username" autoFocus className="h-10" aria-invalid={!!errors.username} {...register("username")} />
          </FormField>
          <FormField label="Password" htmlFor="password" error={errors.password?.message}>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="h-10 pr-10"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </FormField>
          <Button type="submit" size="lg" className="h-10 w-full" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <LogIn />} Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
