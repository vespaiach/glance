import { Component, type ReactNode } from "react";
import type { ZoneState } from "@/domain/zoneState";

type ZoneProps<T> = {
  state: ZoneState<T>;
  loading: ReactNode;
  empty: ReactNode;
  failed: ReactNode;
  children: (data: readonly T[], updatedAt?: string) => ReactNode;
};

type BoundaryProps = {
  fallback: ReactNode;
  resetKey: unknown;
  children: ReactNode;
};

class ZoneBoundary extends Component<BoundaryProps, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidUpdate(previous: BoundaryProps) {
    if (this.state.crashed && previous.resetKey !== this.props.resetKey) {
      this.setState({ crashed: false });
    }
  }

  render() {
    return this.state.crashed ? this.props.fallback : this.props.children;
  }
}

function zoneContent<T>({ state, loading, empty, failed, children }: ZoneProps<T>) {
  switch (state.kind) {
    case "loading":
      return loading;
    case "empty":
      return empty;
    case "failed":
      return failed;
    case "ready":
      return children(state.data, state.updatedAt);
  }
}

export function Zone<T>(props: ZoneProps<T>) {
  return (
    <ZoneBoundary fallback={props.failed} resetKey={props.state}>
      {zoneContent(props)}
    </ZoneBoundary>
  );
}
