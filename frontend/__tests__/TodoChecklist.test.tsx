import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TodoChecklist from "@/components/todos/TodoChecklist";
import { TripTodo } from "@/lib/api";

const mockTodos: TripTodo[] = [
  {
    id: "todo-1",
    trip_id: "trip-tokyo",
    title: "Exchange JR Rail Pass Voucher",
    category: "booking",
    priority: "high",
    is_completed: false,
    due_date: { Time: "2027-04-03T10:00:00Z", Valid: true },
    notes: { String: "Bring physical passport", Valid: true },
  },
  {
    id: "todo-2",
    trip_id: "trip-tokyo",
    title: "Pack 110V power adapter",
    category: "packing",
    priority: "medium",
    is_completed: true,
  },
];

describe("TodoChecklist Component", () => {
  it("renders checklist with items and readiness score", () => {
    const handleToggle = jest.fn();
    const handleCreate = jest.fn();
    const handleDelete = jest.fn();

    render(
      <TodoChecklist
        todos={mockTodos}
        tripId="trip-tokyo"
        onToggle={handleToggle}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    );

    expect(screen.getByText("Pre-Trip Checklist")).toBeInTheDocument();
    expect(screen.getByText("1/2 done")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Exchange JR Rail Pass Voucher")).toBeInTheDocument();
    expect(screen.getByText("Pack 110V power adapter")).toBeInTheDocument();
  });

  it("triggers onToggle when clicking the circle checkbox", () => {
    const handleToggle = jest.fn();
    const handleCreate = jest.fn();
    const handleDelete = jest.fn();

    render(
      <TodoChecklist
        todos={mockTodos}
        tripId="trip-tokyo"
        onToggle={handleToggle}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    );

    const toggleButtons = screen.getAllByRole("button", { name: /mark as/i });
    fireEvent.click(toggleButtons[0]);

    expect(handleToggle).toHaveBeenCalledWith("todo-1");
  });

  it("opens add task form when clicking Add Task button", () => {
    const handleToggle = jest.fn();
    const handleCreate = jest.fn();
    const handleDelete = jest.fn();

    render(
      <TodoChecklist
        todos={mockTodos}
        tripId="trip-tokyo"
        onToggle={handleToggle}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    );

    const addBtn = screen.getByRole("button", { name: /add task/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("New Travel Action")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/reserve jr shinkansen pass/i)).toBeInTheDocument();
  });
});
