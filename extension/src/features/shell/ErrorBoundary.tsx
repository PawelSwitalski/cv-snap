import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "@/lib/logger";

/**
 * Catches render errors so a bug never leaves a blank panel (coding standards → Error Handling).
 * Only the error's name is logged: messages could contain CV text. `fallback` renders the
 * localized message (the boundary itself has no i18n access when the provider failed).
 */
export class ErrorBoundary extends Component<
  { fallback: (reset: () => void) => ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error("side panel render error", error.name, info.componentStack?.length ?? 0);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback(() => {
        this.setState({ hasError: false });
      });
    }
    return this.props.children;
  }
}
