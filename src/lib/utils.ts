import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Although we aren't using Tailwind fully yet, twMerge is good to have if we do, 
// otherwise just clsx is fine. But for now, simple clsx wrapper.
// Wait, I didn't install tailwind-merge. I'll just use clsx.

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}
