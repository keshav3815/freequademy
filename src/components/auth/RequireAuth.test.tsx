import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireAuth from "./RequireAuth";

const authState = {
  loading: false,
  isAuthenticated: false,
  isAdmin: false,
  isModerator: false,
  isMentor: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

function renderAt(allow?: ("student" | "mentor" | "admin" | "moderator")[]) {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/protected" element={<RequireAuth allow={allow}><p>secret</p></RequireAuth>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    Object.assign(authState, { loading: false, isAuthenticated: false, isAdmin: false, isModerator: false, isMentor: false });
  });

  it("shows a loading state while auth resolves", () => {
    authState.loading = true;
    renderAt();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("redirects anonymous visitors to login", () => {
    renderAt();
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("lets any signed-in user through when no roles are required", () => {
    authState.isAuthenticated = true;
    renderAt();
    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("denies students on mentor-only routes", () => {
    authState.isAuthenticated = true;
    renderAt(["mentor", "admin"]);
    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("allows mentors and admins on mentor routes", () => {
    authState.isAuthenticated = true;
    authState.isMentor = true;
    renderAt(["mentor", "admin"]);
    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("allows admins on admin routes but not mentors", () => {
    authState.isAuthenticated = true;
    authState.isMentor = true;
    renderAt(["admin", "moderator"]);
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });
});
