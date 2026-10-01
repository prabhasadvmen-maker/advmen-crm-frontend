import React, { Component, ReactNode, Suspense } from 'react';
import { ErrorState } from '@/components/patterns/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  name: string;
  fallback?: ReactNode;
  skeletonVariant?: 'text' | 'circular' | 'rectangular' | 'card' | 'table-row';
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class BoundaryCatcher extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[WidgetBoundary:${this.props.name}] Caught failure:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <ErrorState
            title={`Failed to load ${this.props.name}`}
            description="This component encountered an issue. Other panels continue to operate normally."
            action={{
              label: 'Retry Widget',
              onClick: () => this.setState({ hasError: false, error: undefined }),
            }}
          />
        )
      );
    }
    return this.props.children;
  }
}

export function WidgetBoundary({ name, fallback, skeletonVariant = 'card', children }: Props) {
  return (
    <BoundaryCatcher name={name} fallback={fallback}>
      <Suspense fallback={<Skeleton variant={skeletonVariant} />}>{children}</Suspense>
    </BoundaryCatcher>
  );
}
