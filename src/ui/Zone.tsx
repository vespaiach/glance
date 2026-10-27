"use client";

import { Component, type ContextType, type ErrorInfo, type ReactNode } from "react";
import type { ZoneState } from "@/domain/zoneState";
import { CrashReportContext } from "./crashReport";

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
  static contextType = CrashReportContext;

  declare context: ContextType<typeof CrashReportContext>;

  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.context("zone-crashed", error, { component: crashedComponent(info.componentStack) });
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

export function Zone<T>(props: ZoneProps<T>) {
  return (
    <ZoneBoundary fallback={props.failed} resetKey={props.state}>
      {zoneContent(props)}
    </ZoneBoundary>
  );
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

function crashedComponent(componentStack: string | null | undefined): string | undefined {
  return componentStack
    ?.trim()
    .split("\n")[0]
    ?.match(/^(?:at\s+)?([^\s(@]+)/)?.[1];
}
