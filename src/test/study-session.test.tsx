import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const submitted: any[] = [];
vi.mock("@/lib/reviewWriter", () => ({ submitReview: (p: unknown) => submitted.push(p), flushPending: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const card = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  user_id: "u1",
  category_id: "c1",
  name_nl: name,
  name_latin: `${name} latin`,
  image_path: `u1/${id}.png`,
  marker: { x: 40, y: 40, w: 20, h: 20 },
  covers: [],
  origin: "Scapula",
  insertion: null,
  innervation: null,
  function: null,
  image_source: "Wikimedia",
  image_author: "Gray",
  image_license: "CC0",
  ...extra,
});

let tables: { categories: unknown[]; cards: unknown[]; reviews: unknown[] };
let existing: string[] | null;

vi.mock("@/integrations/supabase/client", () => {
  const from = (table: string) => {
    let ids: string[] | null = null;
    const q: any = {
      select: () => q,
      order: () => q,
      range: () => q,
      in: (_c: string, v: string[]) => ((ids = v), q),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
        let data = (tables as Record<string, unknown[]>)[table] ?? [];
        // the "is this card still there" check
        if (ids && existing) data = existing.filter((i) => ids!.includes(i)).map((id) => ({ id }));
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return q;
  };
  return {
    supabase: {
      from,
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }, error: null }) }) },
    },
  };
});

import { StudySession } from "@/components/StudySession";

function renderSession(props: Partial<React.ComponentProps<typeof StudySession>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <StudySession categoryIds={null} direction="image" newLimit={10} {...props} />
    </QueryClientProvider>,
  );
}

const findStage = () =>
  waitFor(() => {
    const img = document.querySelector("img");
    if (!img) throw new Error("image not loaded yet");
    return img.parentElement!;
  });

// jsdom has no PointerEvent and drops clientX/Y on a plain Event, so send a MouseEvent of that type
const pointerDown = (el: Element, clientX: number, clientY: number) =>
  fireEvent(el, new MouseEvent("pointerdown", { clientX, clientY, bubbles: true }));

const press = (key: string) => act(() => void fireEvent.keyDown(window, { key }));

beforeEach(() => {
  submitted.length = 0;
  existing = null;
  tables = {
    categories: [{ id: "c1", name: "Arm", color: "mint", user_id: "u1" }],
    cards: [card("a", "Biceps"), card("b", "Triceps")],
    reviews: [],
  };
});
afterEach(cleanup);

describe("StudySession", () => {
  it("hides the name, reveals on Space, rates with 1-4 and shows the summary", async () => {
    renderSession();
    await screen.findByText("1 / 2");
    expect(screen.queryByText(/Biceps|Triceps/)).toBeNull(); // name is hidden in "Name from image"

    press(" ");
    const shown = await screen.findByRole("heading", { level: 2 });
    expect(shown.textContent).toMatch(/Biceps|Triceps/);
    expect(screen.getByText(/Afbeelding: Wikimedia · Gray · CC0/)).toBeTruthy();
    expect(screen.getByText("Origo:")).toBeTruthy();
    // intervals under the pills for a brand new card: again 1d, hard 1d, good 1d, easy 3d
    expect(screen.getAllByText("1d")).toHaveLength(3);
    expect(screen.getByText("3d")).toBeTruthy();

    press("3"); // Good
    await screen.findByText("2 / 2");
    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({ rating: "good", direction: "image", user_id: "u1" });
    expect(submitted[0].review).toMatchObject({ interval_days: 1, repetitions: 1, ease_factor: 2.5 });

    press(" ");
    await screen.findByRole("heading", { level: 2 });
    press("4"); // Easy
    await screen.findByText("Sessie voltooid");
    expect(submitted.map((s) => s.rating)).toEqual(["good", "easy"]);
    expect(screen.getByText(/kaarten herhaald in/)).toBeTruthy();
  });

  it("puts an 'Again' card at the end of the session", async () => {
    renderSession();
    await screen.findByText("1 / 2");
    press(" ");
    await screen.findByRole("heading", { level: 2 });
    press("1"); // Again
    await screen.findByText("2 / 3"); // queue grew by one
    expect(submitted[0]).toMatchObject({ rating: "again" });
    expect(submitted[0].review).toMatchObject({ interval_days: 1, repetitions: 0, ease_factor: 2.3 });
  });

  it("practice mode shows cards that are not due and saves no reviews", async () => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const due = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    tables.reviews = [
      { card_id: "a", due_date: due, ease_factor: 2.5, interval_days: 6, repetitions: 3 },
      { card_id: "b", due_date: due, ease_factor: 2.5, interval_days: 6, repetitions: 3 },
    ];
    renderSession({ practice: true, newLimit: 0 });
    await screen.findByText("1 / 2");
    expect(screen.getByText("Oefenen")).toBeTruthy();
    press(" ");
    await screen.findByRole("heading", { level: 2 });
    press("3");
    await screen.findByText("2 / 2");
    expect(submitted).toHaveLength(0);
  });

  it("ignores rating keys before the answer is shown", async () => {
    renderSession();
    await screen.findByText("1 / 2");
    press("3");
    expect(submitted).toHaveLength(0);
  });

  it("shows 'All caught up' when nothing is due or new", async () => {
    tables.cards = [];
    renderSession();
    await screen.findByText("Helemaal bij");
  });

  it("respects the new cards limit and due-first order", async () => {
    tables.reviews = [{ card_id: "b", due_date: "2000-01-01", ease_factor: 2.5, interval_days: 3, repetitions: 2, user_id: "u1" }];
    tables.cards = [card("a", "Biceps"), card("b", "Triceps"), card("c", "Deltoid")];
    renderSession({ newLimit: 0 });
    await screen.findByText("1 / 1"); // only the due card, no new ones
    press(" ");
    expect((await screen.findByRole("heading", { level: 2 })).textContent).toBe("Triceps");
    // good on repetitions=2: round(3 * 2.5) = 8 days
    expect(screen.getByText("8d")).toBeTruthy();
  });

  it("location direction: skips cards without a marker, checks the tap against the marker", async () => {
    tables.cards = [card("a", "Biceps"), card("b", "Triceps", { marker: null })];
    renderSession({ direction: "location" });
    await screen.findByText("1 / 1");
    expect(screen.getByText("Biceps")).toBeTruthy(); // name is shown in this direction
    expect(screen.queryByText("Triceps")).toBeNull();

    const stage = await findStage();
    stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} });
    pointerDown(stage, 100, 50); // 50%, 50%: inside the marker
    expect(await screen.findByText("Je had het gevonden!")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Goed" })).toBeTruthy();
  });

  it("location direction: a tap outside the marker suggests Again", async () => {
    tables.cards = [card("a", "Biceps")];
    renderSession({ direction: "location" });
    await screen.findByText("1 / 1");
    const stage = await findStage();
    stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} });
    pointerDown(stage, 10, 10);
    expect(await screen.findByText(/Net niet/)).toBeTruthy();
    expect(screen.getByRole("img", { name: "Niet helemaal" })).toBeTruthy();
    const again = screen.getByRole("button", { name: /Opnieuw/ });
    expect(again.className).toMatch(/ring-2/); // pre-highlighted
  });

  it("skips a card that was deleted while studying", async () => {
    tables.cards = [card("a", "Biceps"), card("b", "Triceps"), card("c", "Deltoid")];
    existing = ["a", "b", "c"];
    renderSession();
    await screen.findByText("1 / 3");
    existing = null; // placeholder so the next check can drop a card
    // deleting everything except the first card
    existing = [];
    press(" ");
    await screen.findByRole("heading", { level: 2 });
    press("3");
    // next card check finds nothing left, so the session ends instead of showing a deleted card
    await waitFor(() => expect(screen.getByText("Sessie voltooid")).toBeTruthy());
  });
});
