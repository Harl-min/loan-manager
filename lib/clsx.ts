export function clsx(...args: unknown[]): string {
  return args.filter((a): a is string => typeof a === "string" && a.length > 0).join(" ");
}
