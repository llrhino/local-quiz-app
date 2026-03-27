import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import Button from './Button';
import Card from './Card';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  private handleGoHome = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="space-y-4">
          <p className="text-red-600 dark:text-red-400">
            予期しないエラーが発生しました
          </p>
          <Button onClick={this.handleGoHome}>ホームに戻る</Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
