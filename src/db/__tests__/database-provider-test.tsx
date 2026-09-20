import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

import { DatabaseProvider } from "../database-provider";

let mockShouldFail = true;

jest.mock("expo-sqlite", () => ({
  SQLiteProvider: ({
    children,
    onError,
  }: {
    children: ReactNode;
    onError?: (error: Error) => void;
  }) => {
    const { useEffect } = jest.requireActual("react") as typeof import("react");

    useEffect(() => {
      if (mockShouldFail) {
        onError?.(new Error("database unavailable"));
      }
    }, [onError]);

    return <>{children}</>;
  },
}));

describe("DatabaseProvider", () => {
  beforeEach(() => {
    mockShouldFail = true;
  });

  it("renders a retryable fallback after initialization fails", async () => {
    const view = await render(
      <DatabaseProvider
        fallback={(onRetry) => (
          <>
            <Text>database-error</Text>
            <Pressable accessibilityRole="button" onPress={onRetry}>
              <Text>retry-database</Text>
            </Pressable>
          </>
        )}
      >
        <Text>database-ready</Text>
      </DatabaseProvider>,
    );

    await waitFor(() => expect(view.getByText("database-error")).toBeTruthy());
    expect(view.queryByText("database-ready")).toBeNull();

    mockShouldFail = false;
    fireEvent.press(view.getByText("retry-database"));
    await waitFor(() => expect(view.getByText("database-ready")).toBeTruthy());
  });
});
