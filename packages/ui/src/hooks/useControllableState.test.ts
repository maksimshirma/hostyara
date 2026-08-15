import { act, renderHook } from "@testing-library/react";
import { useControllableState } from "./useControllableState";

describe("useControllableState", () => {
  it("manages its own state when uncontrolled", () => {
    const { result } = renderHook(() => useControllableState({ defaultValue: false }));

    expect(result.current[0]).toBe(false);

    act(() => result.current[1](true));

    expect(result.current[0]).toBe(true);
  });

  it("calls onChange when the uncontrolled value changes", () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: false, onChange }));

    act(() => result.current[1](true));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("reflects the external value and does not manage its own state when controlled", () => {
    const onChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState({ value, defaultValue: false, onChange }),
      { initialProps: { value: true } },
    );

    expect(result.current[0]).toBe(true);

    act(() => result.current[1](false));

    expect(onChange).toHaveBeenCalledWith(false);
    expect(result.current[0]).toBe(true);

    rerender({ value: false });
    expect(result.current[0]).toBe(false);
  });
});
