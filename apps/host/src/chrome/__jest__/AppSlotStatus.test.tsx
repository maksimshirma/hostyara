import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppSlotStatus } from "../AppSlotStatus";
import { SlotStatus } from "../slotStatus";

describe("AppSlotStatus", () => {
  it("renders nothing for idle and mounted states", () => {
    const { container: idle } = render(
      <AppSlotStatus status={{ kind: "idle" }} onRetry={() => {}} onRequestAccess={() => {}} />,
    );
    expect(idle).toBeEmptyDOMElement();

    const { container: mounted } = render(
      <AppSlotStatus status={{ kind: "mounted" }} onRetry={() => {}} onRequestAccess={() => {}} />,
    );
    expect(mounted).toBeEmptyDOMElement();
  });

  it("shows a loading message with the app name", () => {
    render(
      <AppSlotStatus
        status={{ kind: "loading", appName: "Рецепты" }}
        onRetry={() => {}}
        onRequestAccess={() => {}}
      />,
    );
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
      { kind: "error", appName: "Рецепты", reason: { kind: "no-access", requested: false } },
      "нет доступа к «Рецепты»",
    ],
    [
      { kind: "error", appName: "Рецепты", reason: { kind: "no-access", requested: true } },
      "Запрос доступа",
    ],
    [
      { kind: "error", appName: "Рецепты", reason: { kind: "not-member" } },
      "Нет доступа к этому пространству",
    ],
    [
      { kind: "error", appName: "Рецепты", reason: { kind: "access-unavailable" } },
      "Не удалось проверить доступ",
    ],
    [
      {
        kind: "error",
        appName: "Рецепты",
        reason: { kind: "load-failed", message: "network down" },
      },
      "network down",
    ],
  ])("renders the message for %p", (status, expectedSubstring) => {
    render(<AppSlotStatus status={status} onRetry={() => {}} onRequestAccess={() => {}} />);
    expect(screen.getByText(new RegExp(expectedSubstring))).toBeInTheDocument();
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const onRetry = jest.fn();
    render(
      <AppSlotStatus
        status={{ kind: "error", appName: "Рецепты", reason: { kind: "timeout" } }}
        onRetry={onRetry}
        onRequestAccess={() => {}}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers to request view or edit access when there is no grant", async () => {
    const onRequestAccess = jest.fn();
    render(
      <AppSlotStatus
        status={{
          kind: "error",
          appName: "Рецепты",
          reason: { kind: "no-access", requested: false },
        }}
        onRetry={() => {}}
        onRequestAccess={onRequestAccess}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Запросить редактирование" }));

    expect(onRequestAccess).toHaveBeenCalledWith("edit");
    expect(screen.queryByRole("button", { name: "Повторить" })).not.toBeInTheDocument();
  });

  it("offers no actions once access was requested or the app is not installed", () => {
    const { rerender } = render(
      <AppSlotStatus
        status={{
          kind: "error",
          appName: "Рецепты",
          reason: { kind: "no-access", requested: true },
        }}
        onRetry={() => {}}
        onRequestAccess={() => {}}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(
      <AppSlotStatus
        status={{ kind: "error", appName: "Рецепты", reason: { kind: "not-installed" } }}
        onRetry={() => {}}
        onRequestAccess={() => {}}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
