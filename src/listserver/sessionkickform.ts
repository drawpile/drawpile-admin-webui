// SPDX-License-Identifier: MIT
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DrawpileElement, RenderResult } from "../element";
import { ListserverApi, ListserverSessionResponse } from "./api";
import { killEvent } from "../util";

@customElement("listserver-session-kick-form")
export class ListserverSessionKickForm extends DrawpileElement {
  @property() api!: ListserverApi;
  @property() sessions!: ListserverSessionResponse[];
  @state() submitting: boolean = false;
  @state() reason: string = "";
  @state() error: string = "";

  private submit(e: Event): void {
    killEvent(e);
    if (!this.submitting) {
      this.submitting = true;
      this.error = "";
      const sessionIds = this.sessions.map(
        (session: ListserverSessionResponse): number => session.id
      );
      this.api
        .putSessions(sessionIds, this.reason)
        .then((): void => {
          this.emit("finish");
        })
        .catch((reason: any): void => {
          this.error = this.api.getErrorMessage(reason);
          this.submitting = false;
        });
    }
  }

  private cancel(e: Event): void {
    killEvent(e);
    if (!this.submitting) {
      this.emit("cancel");
    }
  }

  protected override render(): RenderResult {
    const count = this.sessions.length;
    return html`
      <hgroup>
        <h3>Unlist</h3>
        <h4>Remove ${count} session listing${count === 1 ? "" : "s"}.</h4>
      </hgroup>
      <form @submit="${this.submit}">
        <label>
          Reason
          <input
            type="text"
            name="unlistreason"
            @change="${this.bindInput("reason")}"
            @keyup="${this.bindInput("reason")}"
            readonly="${this.submitting || nothing}"
            autofocus
          />
          <small>
            Optional, will be shown to the offending
            session${count === 1 ? "" : "s"}.
          </small>
        </label>
        ${this.renderError()}
        <div class="grid">
          <button
            type="submit"
            disabled="${this.submitting || nothing}"
            aria-busy="${this.submitting || nothing}"
          >
            ${this.submitting ? "Unlisting…" : "Unlist"}
          </button>
          <button
            class="secondary"
            disabled="${this.submitting || nothing}"
            @click="${this.cancel}"
          >
            Cancel
          </button>
        </div>
      </form>
    `;
  }

  private renderError(): RenderResult {
    if (this.error) {
      return html` <p class="error"><strong>Error:</strong> ${this.error}</p> `;
    } else {
      return nothing;
    }
  }
}
