import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppSlotStatus } from "../AppSlotStatus";
import { SlotStatus } from "../slotStatus";

describe("AppSlotStatus", () => {
  it("renders nothing for idle and mounted states", () => {
    const { container: idle } = render(
      <AppSlotStatus status={{ kind: "idle" }} onRetry={() => {}} />,
    );
    expect(idle).toBeEmptyDOMElement();

    const { container: mounted } = render(
      <AppSlotStatus status={{ kind: "mounted" }} onRetry={() => {}} />,
    );
    expect(mounted).toBeEmptyDOMElement();
  });

  it("shows a loading message with the app name", () => {
    render(<AppSlotStatus status={{ kind: "loading", appName: "Рецепты" }} onRetry={() => {}} />);
    expect(screen.getByText("Загрузка «Рецепты»…")).toBeInTheDocument();
  });

  it.each<[SlotStatus, string]>([
    [{ kind: "error", appName: "Рецепты", reason: { kind: "not-installed" } }, "не подключено"],
    [
      {
        kind: "error",
        appName: "Рецепты",
        reason: { kind: "incompatible-contract", expectedMajor: "1", actualMajor: "2" },
      },
      "несовместимо",
    ],
    [{ kind: "error", appName: "Рецепты", reason: { kind: "timeout" } }, "не отвечает"],
    [
      {
        kind: "error",
        appName: "Рецепты",
        reason: { kind: "load-failed", message: "network down" },
      },
      "network down",
    ],
  ])("renders the message for %p", (status, expectedSubstring) => {
    render(<AppSlotStatus status={status} onRetry={() => {}} />);
    expect(screen.getByText(new RegExp(expectedSubstring))).toBeInTheDocument();
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const onRetry = jest.fn();
    render(
      <AppSlotStatus
        status={{ kind: "error", appName: "Рецепты", reason: { kind: "timeout" } }}
        onRetry={onRetry}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
