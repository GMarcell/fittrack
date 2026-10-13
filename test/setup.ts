import { vi } from "vitest";

// Mock next/server
vi.mock("next/server", () => ({
  NextRequest: class {
    public url: string;
    public headers: Headers;
    public nextUrl: URL;

    constructor(input: string | Request, init?: RequestInit) {
      this.url = typeof input === "string" ? input : input.url;
      this.headers = new Headers(init?.headers);
      this.nextUrl = new URL(this.url, "http://localhost:3000");
    }

    async json() {
      return {};
    }
  },
  NextResponse: {
    json(body: unknown, init?: ResponseInit) {
      return {
        status: init?.status ?? 200,
        body: JSON.stringify(body),
        headers: new Headers(init?.headers),
        async json() {
          return body;
        },
      };
    },
  },
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  signIn: vi.fn(),
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

// Mock bcryptjs (default import only — lib/auth uses `import bcrypt from "bcryptjs"`)
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock next-auth/providers/credentials (imported by lib/auth)
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({ type: "credentials", id: "credentials" })),
}));

// jsdom does not implement the browser APIs Radix primitives measure with.
// Without these, rendering a Select/SelectTrigger throws in component tests.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}

// Set default env vars for tests
process.env.AUTH_SECRET = "test-auth-secret";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
