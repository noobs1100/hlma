import { authClient } from "@/lib/auth-client";

export const validateEmail = (email: string) => {
  const trimmedEmail = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
};

export const validatePassword = (password: string) =>
  password.trim().length >= 8;

export const validateName = (name: string) => name.trim().length >= 2;

const getAuthMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;

    if (message) {
      return message;
    }
  }

  return fallback;
};

export const signInWithEmail = async (email: string, password: string) => {
  const response = await authClient.signIn.email({
    email: email.trim(),
    password,
  });

  if (response.error) {
    throw new Error(getAuthMessage(response.error, "Could not sign in."));
  }

  return response.data ?? null;
};

export const signUpWithEmail = async (
  name: string,
  email: string,
  password: string,
) => {
  const response = await authClient.signUp.email({
    name: name.trim(),
    email: email.trim(),
    password,
  });

  if (response.error) {
    throw new Error(
      getAuthMessage(response.error, "Could not create your account."),
    );
  }

  return response.data ?? null;
};

export const restoreSession = async () => {
  const response = await authClient.getSession();

  if (response.error) {
    return null;
  }

  return response.data ?? null;
};

export const signOut = async () => {
  await authClient.signOut();
};
