/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TRY_FOR_FREE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
