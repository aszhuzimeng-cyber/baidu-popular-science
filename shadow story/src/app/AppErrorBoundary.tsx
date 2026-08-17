import { Component, type ErrorInfo, type PropsWithChildren } from "react";

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "未知错误",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("应用渲染异常:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#2b1812] p-6 text-[#f9e7c1]">
          <div className="max-w-xl rounded-2xl border border-[#a56d42] bg-[#5b2f1f]/90 p-5">
            <h1 className="text-2xl font-semibold">页面渲染失败</h1>
            <p className="mt-3 text-base opacity-90">请把这段错误发给我继续修复：</p>
            <pre className="mt-3 overflow-auto rounded bg-black/25 p-3 text-sm">
              {this.state.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
