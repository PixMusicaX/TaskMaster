// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import GoogleEventCard from "@/components/google-event-card";
import type { EventRow } from "@/lib/types";

afterEach(cleanup);

const imported = (values: Partial<EventRow> = {}) =>
  ({ title: "Dentist", description: null, gcalReadOnly: false, ...values }) as EventRow;

function setup(event = imported()) {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onAdd: vi.fn() };
  const { container } = render(<GoogleEventCard event={event} title={event.title} time="13:00–14:00" {...handlers} />);
  return { ...handlers, container };
}

describe("GoogleEventCard", () => {
  it("offers a task and each event tier, one Google colour each", () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByText("Add to TaskMaster"));
    const colours = ["Task", "Side event", "Main event", "Epic event"].map(label => screen.getByText(label).style.background);
    expect(new Set(colours).size).toBe(4);

    fireEvent.click(screen.getByText("Main event"));
    expect(onAdd).toHaveBeenCalledWith("event", "main");
  });

  it("adds a task with no tier", () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByText("Add to TaskMaster"));
    fireEvent.click(screen.getByText("Task"));
    expect(onAdd).toHaveBeenCalledWith("task", undefined);
  });

  it("uses fixed colours, not the theme's", () => {
    const { container } = setup();
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.background).toBeTruthy();
    expect(card.className).not.toMatch(/tm-/);
  });

  it("can't be edited when it's someone else's invite, but can still be removed", () => {
    const { onDelete } = setup(imported({ gcalReadOnly: true }));
    expect(screen.queryByLabelText("Edit Dentist")).toBeNull();
    fireEvent.click(screen.getByLabelText("Delete Dentist"));
    expect(onDelete).toHaveBeenCalled();
  });
});
