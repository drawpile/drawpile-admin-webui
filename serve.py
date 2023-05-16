#!/usr/bin/env python
# SPDX-License-Identifier: MIT
import argparse
import contextlib
import http.server
import os
import socketserver


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(os.path.realpath(__file__)), "dist"))

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-b",
        "--bind",
        metavar="ADDRESS",
        help="bind to this address (default: all interfaces)",
    )
    parser.add_argument(
        "-p",
        "--protocol",
        metavar="VERSION",
        default="HTTP/1.0",
        help="conform to this HTTP version " "(default: %(default)s)",
    )
    parser.add_argument(
        "port",
        default=8000,
        type=int,
        nargs="?",
        help="bind to this port " "(default: %(default)s)",
    )
    args = parser.parse_args()

    http.server.test(
        HandlerClass=Handler,
        port=args.port,
        bind=args.bind,
        protocol=args.protocol,
    )
