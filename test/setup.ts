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

// Mock groq-sdk
vi.mock("groq-sdk", () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

// Set default env vars for tests
process.env.GROQ_API_KEY = "test-groq-key";
process.env.CRON_SECRET = "test-cron-secret";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
