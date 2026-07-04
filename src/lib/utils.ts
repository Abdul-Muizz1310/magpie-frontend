import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Exhaustiveness guard. Placing this in the `default` branch of a switch over a
 * discriminated union / closed enum makes the compiler reject the code the
 * moment a new variant is added but left unhandled (negative-space programming).
 * If somehow reached at runtime (e.g. unvalidated input), it fails loudly.
 */
export function assertNever(value: never): never {
	throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
