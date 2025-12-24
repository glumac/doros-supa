import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useHasPendingFollowRequest, useIsBlockedByUser, useIsFollowingUser } from "../useFollowStatus";
import * as queries from "../../lib/queries";

vi.mock("../../lib/queries", () => ({
  isFollowingUser: vi.fn(),
  getFollowRequestStatus: vi.fn(),
  isBlockedByUser: vi.fn(),
}));

describe("useFollowStatus hooks", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useIsFollowingUser returns following status", async () => {
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: true,
      error: null,
    });

    const { result } = renderHook(
      () => useIsFollowingUser("me", "them"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it("useIsFollowingUser uses initial data when provided", async () => {
    vi.mocked(queries.isFollowingUser).mockResolvedValue({
      isFollowing: false,
      error: null,
    });

    const { result } = renderHook(
      () => useIsFollowingUser("me", "them", true),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBe(true);
  });

  it("useHasPendingFollowRequest returns pending status", async () => {
    vi.mocked(queries.getFollowRequestStatus).mockResolvedValue({
      data: { id: "req-1", status: "pending" },
      error: null,
    } as any);

    const { result } = renderHook(
      () => useHasPendingFollowRequest("me", "them"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it("useIsBlockedByUser returns block status", async () => {
    vi.mocked(queries.isBlockedByUser).mockResolvedValue(true);

    const { result } = renderHook(
      () => useIsBlockedByUser("me", "them"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });
});

