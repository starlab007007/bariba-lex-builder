/// <reference types="vite/client" />

// Provide NodeJS namespace for setTimeout/setInterval return types
declare namespace NodeJS {
  type Timeout = ReturnType<typeof globalThis.setTimeout>;
  type Timer = ReturnType<typeof globalThis.setInterval>;
}

