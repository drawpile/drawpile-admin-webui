// SPDX-License-Identifier: MIT
type CatchallHandler<T> = [null, (() => T) | null];
type RegExpHandler<T> = [RegExp, ((match: RegExpExecArray) => T) | null];
type PrefixHandler<T> = [string, ((rest: string) => T) | null];
type PrefixArrayHandler<T> = [
  readonly string[],
  ((prefix: string, rest: string) => T) | null
];
type Handler<T> =
  | CatchallHandler<T>
  | RegExpHandler<T>
  | PrefixHandler<T>
  | PrefixArrayHandler<T>;

export class Router {
  private static instance?: Router;
  private onChange: (route: string) => void;
  private path!: string;

  static init(onChange: (route: string) => void) {
    if (Router.instance) {
      console.warn("Router has already been instantiated");
      Router.instance.onChange = onChange;
      Router.instance.updatePath(Router.instance.path);
    } else {
      new Router(onChange);
    }
  }

  private constructor(onChange: (route: string) => void) {
    Router.instance = this;
    this.onChange = onChange;
    window.addEventListener("hashchange", (e: HashChangeEvent): void => {
      this.updateLocation(e.newURL);
    });
    this.updateLocation(location.href);
  }

  private updateLocation(href: string): void {
    const url = new URL(href);
    this.updatePath(url.hash.replace(/^#/, ""));
  }

  private updatePath(path: string): void {
    this.path = path.trim().toLowerCase();
    this.onChange(this.path);
  }

  static push(path: string): void {
    history.pushState(null, "", `#${path}`);
    Router.instance!.updatePath(path);
  }

  static replace(path: string): void {
    history.replaceState(null, "", `#${path}`);
    Router.instance!.updatePath(path);
  }

  static dispatch<T>(path: string, ...handlers: Handler<T>[]): T | undefined {
    for (const handler of handlers) {
      const [matcher, fn] = handler;
      if (matcher === null) {
        return fn ? fn() : undefined;
      } else if (typeof matcher === "string") {
        const [matched, result] = Router.dispatchPrefix(path, handler);
        if (matched) {
          return result;
        }
      } else if (Array.isArray(matcher)) {
        const [matched, result] = Router.dispatchPrefixArray(
          path,
          handler as PrefixArrayHandler<T>
        );
        if (matched) {
          return result;
        }
      } else {
        const [matched, result] = Router.dispatchRegExp(
          path,
          handler as RegExpHandler<T>
        );
        if (matched) {
          return result;
        }
      }
    }
    return undefined;
  }

  private static dispatchPrefix<T>(
    path: string,
    [matcher, fn]: PrefixHandler<T>
  ): [boolean, T | undefined] {
    const [matched, rest] = Router.prefixMatches(path, matcher);
    if (matched) {
      return [true, fn ? fn(rest === "" ? "/" : rest) : undefined];
    } else {
      return [false, undefined];
    }
  }

  private static dispatchPrefixArray<T>(
    path: string,
    [matcher, fn]: PrefixArrayHandler<T>
  ): [boolean, T | undefined] {
    for (const prefix of matcher) {
      const [matched, rest] = Router.prefixMatches(path, prefix);
      if (matched) {
        return [true, fn ? fn(prefix, rest === "" ? "/" : rest) : undefined];
      }
    }
    return [false, undefined];
  }

  private static dispatchRegExp<T>(
    path: string,
    [matcher, fn]: RegExpHandler<T>
  ): [boolean, T | undefined] {
    const result = matcher.exec(path);
    if (result) {
      return [true, fn ? fn(result) : undefined];
    } else {
      return [false, undefined];
    }
  }

  private static prefixMatches(
    path: string,
    prefix: string
  ): [true, string] | [false, undefined] {
    if (path.startsWith(prefix)) {
      const rest = path.substring(prefix.length);
      if (rest === "" || rest.startsWith("/")) {
        return [true, rest];
      }
    }
    return [false, undefined];
  }
}
