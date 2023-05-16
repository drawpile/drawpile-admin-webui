// SPDX-License-Identifier: MIT
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DrawpilePageElement, RenderResult } from "../element";
import {
  LISTSERVER_ACCESS_MANAGE,
  ListserverApi,
  ListserverRootResponse,
} from "./api";
import { ApiResponse } from "../api";
import { LoginEventDetail } from "./login";
import { Router } from "../router";
import "./changepasswordform";
import "./hostbanspage";
import "./login";
import "./navlink";
import "./rolespage";
import "./serverpage";
import "./sessionspage";
import "./userspage";
import { killEvent } from "../util";

@customElement("listserver-index")
export class ListserverIndex extends DrawpilePageElement {
  static readonly pages = Object.freeze([
    "/server",
    "/sessions",
    "/hostbans",
    "/roles",
    "/users",
    "/changepassword",
  ]);

  @property() apibaseurl!: string;
  @state() api: ListserverApi | null = null;
  @state() rootResponse?: ApiResponse<ListserverRootResponse>;
  @state() wantLogout: boolean = false;
  targetPath?: string;

  protected override checkPath(): void {
    Router.dispatch(
      this.path,
      [
        ListserverIndex.pages,
        (): void => {
          if (!this.api) {
            this.targetPath = this.path;
            Router.replace("/listserver/login");
          }
        },
      ],
      ["/login", null],
      [
        null,
        () => {
          if (this.api) {
            Router.replace(`/listserver${ListserverIndex.pages[0]}`);
          } else {
            Router.replace("/listserver/login");
          }
        },
      ]
    );
  }

  private login(e: CustomEvent): void {
    const detail = e.detail as LoginEventDetail;
    this.api = detail.api;
    this.rootResponse = detail.rootResponse;
    this.wantLogout = false;
    if (this.targetPath) {
      Router.push(`/listserver${this.targetPath}`);
      delete this.targetPath;
    } else {
      Router.push(`/listserver${ListserverIndex.pages[0]}`);
    }
  }

  private changePassword(e: Event): void {
    killEvent(e);
    this.targetPath = this.path;
    Router.push("/listserver/changepassword");
  }

  private finishPasswordChange(e: Event): void {
    killEvent(e);
    this.api = null;
    Router.push("/listserver/login");
  }

  private cancelPasswordChange(e: Event): void {
    killEvent(e);
    if (this.targetPath) {
      Router.push(`/listserver${this.targetPath}`);
      delete this.targetPath;
    } else {
      Router.push(`/listserver${ListserverIndex.pages[0]}`);
    }
  }

  private logout(e: Event): void {
    killEvent(e);
    this.api = null;
    this.wantLogout = true;
    this.targetPath = this.path;
    Router.push("/listserver/login");
  }

  private updateRootResponse(e: CustomEvent): void {
    const detail = e.detail as ApiResponse<ListserverRootResponse>;
    if (detail) {
      this.rootResponse = detail;
    }
  }

  override render(): RenderResult {
    return Router.dispatch(
      this.path,
      [
        ListserverIndex.pages,
        (prefix: string, rest: string): RenderResult => {
          if (this.api) {
            return this.renderMain(prefix, rest);
          } else {
            return nothing;
          }
        },
      ],
      ["/login", this.renderLogin.bind(this)],
      [null, (): RenderResult => nothing]
    );
  }

  private renderLogin(): RenderResult {
    return html`
      <main class="container">
        <listserver-login
          apibaseurl="${this.apibaseurl}"
          wantlogout="${this.wantLogout || nothing}"
          @login="${this.login}"
        ></listserver-login>
      </main>
    `;
  }

  private renderMain(prefix: string, rest: string): RenderResult {
    const { server, user } = this.rootResponse!.result;
    return html`
      <main class="container">
        <article>
          <header>
            <hgroup>
              <h1>${server.name} List Server Admin</h1>
              <h2>${server.description}</h2>
            </hgroup>
            <div class="grid">
              <listserver-navlink
                path="${this.path}"
                href="/server"
                label="Server"
              ></listserver-navlink>
              <listserver-navlink
                path="${this.path}"
                href="/sessions"
                label="Sessions"
              ></listserver-navlink>
              <listserver-navlink
                path="${this.path}"
                href="/hostbans"
                label="Bans"
              ></listserver-navlink>
              <listserver-navlink
                path="${this.path}"
                href="/roles"
                label="Roles"
              ></listserver-navlink>
              <listserver-navlink
                path="${this.path}"
                href="/users"
                label="Users"
              ></listserver-navlink>
            </div>
          </header>
          ${this.renderPage(prefix, rest)}
          <footer>
            <div class="grid">
              <div class="input-padded">
                Logged in as <strong>${user.name}</strong> (#${user.id})
              </div>
              ${this.renderChangePasswordButton(user.id, prefix)}
              <button class="outline" @click="${this.logout}">Log out</button>
            </div>
          </footer>
        </article>
      </main>
    `;
  }

  private renderChangePasswordButton(
    userId: number,
    prefix: string
  ): RenderResult {
    if (userId === 0) {
      return nothing;
    } else {
      const active = prefix === "/changepassword";
      return html`
        <button
          class="secondary${active ? "" : " outline"}"
          disabled="${active || nothing}"
          @click="${active ? nothing : this.changePassword}"
        >
          Change Password
        </button>
      `;
    }
  }

  private renderPage(prefix: string, rest: string): RenderResult {
    if (prefix === "/server") {
      return html`<listserver-server-page
        .api=${this.api}
        .rootResponse=${this.rootResponse}
        path="${rest}"
        @updaterootresponse="${this.updateRootResponse}"
      ></listserver-server-page>`;
    } else if (prefix === "/sessions") {
      const { admin, permissions } = this.rootResponse!.result.user;
      return html`<listserver-sessions-page
        .api=${this.api}
        path="${rest}"
        access="${admin ? LISTSERVER_ACCESS_MANAGE : permissions.sessions}"
      ></listserver-sessions-page>`;
    } else if (prefix === "/hostbans") {
      const { admin, permissions } = this.rootResponse!.result.user;
      return html`<listserver-hostbans-page
        .api=${this.api}
        path="${rest}"
        access="${admin ? LISTSERVER_ACCESS_MANAGE : permissions.hostbans}"
      ></listserver-hostbans-page>`;
    } else if (prefix === "/roles") {
      const { admin, permissions } = this.rootResponse!.result.user;
      return html`<listserver-roles-page
        .api=${this.api}
        path="${rest}"
        access="${admin ? LISTSERVER_ACCESS_MANAGE : permissions.roles}"
      ></listserver-roles-page>`;
    } else if (prefix === "/users") {
      const { admin, permissions } = this.rootResponse!.result.user;
      return html`<listserver-users-page
        .api=${this.api}
        path="${rest}"
        access="${admin ? LISTSERVER_ACCESS_MANAGE : permissions.users}"
      ></listserver-users-page>`;
    } else if (prefix === "/changepassword") {
      return html`<listserver-change-password-form
        .api=${this.api}
        username="${this.rootResponse?.result.user.name}"
        @finish="${this.finishPasswordChange}"
        @cancel="${this.cancelPasswordChange}"
      ></listserver-change-password-form>`;
    } else {
      return html`<p class="error">Unknown page "${prefix}".</p>`;
    }
  }
}
