import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge" // This import is correct, the error is likely due to missing package installation or type declaration.

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
