export function snakeToCamel<T>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }

  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        snakeToCamel(value),
      ]),
    );
  }

  return obj;
}

export function camelToSnake<T>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  }

  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
        camelToSnake(value),
      ]),
    );
  }

  return obj;
}
