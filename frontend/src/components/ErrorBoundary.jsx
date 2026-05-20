import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="glass mx-auto mt-20 max-w-lg rounded-2xl p-6 text-center">Something broke. Refresh and try again.</div>;
    }
    return this.props.children;
  }
}
