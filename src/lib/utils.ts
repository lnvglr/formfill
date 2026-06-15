import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Mirror horizontally in RTL (back/next arrows, chevrons, etc.). */
export function iconDirectional(...inputs: ClassValue[]) {
  return cn("icon-directional rtl:-scale-x-100", inputs)
}
