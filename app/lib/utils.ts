import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 Tailwind class，支持条件与去重
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
