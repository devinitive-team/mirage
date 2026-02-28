const DEFAULT_TRY_FOR_FREE_URL = 'http://localhost:3000';

export const tryForFreeUrl =
  import.meta.env.PUBLIC_TRY_FOR_FREE_URL?.trim() || DEFAULT_TRY_FOR_FREE_URL;
