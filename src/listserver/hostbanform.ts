// SPDX-License-Identifier: MIT
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DrawpileElement, RenderResult } from "../element";
import { ListserverApi } from "./api";
import { ApiResponse } from "../api";
import { formatDate, killEvent } from "../util";

const FOREVER = "9999-12-31";

@customElement("listserver-hostban-form")
export class ListserverHostBanForm extends DrawpileElement {
  @property() api!: ListserverApi;
  @property({ type: Number }) existingId?: number;
  @property() host: string = "";
  @property() expires: string = FOREVER;
  @property() notes: string = "";
  @property({ type: Boolean }) deletion: boolean = false;
  @state() submitting: boolean = false;
  @state() error: string = "";

  private isCreateForm(): boolean {
    return this.existingId === undefined;
  }

  private isDeleteForm(): boolean {
    return !this.isCreateForm() && this.deletion;
  }

  private submit(e: Event): void {
    killEvent(e);
    if (!this.submitting) {
      this.submitting = true;
      this.error = "";
      this.submitRequest()
        .then((): void => {
          this.emit("finish");
        })
        .catch((reason: any): void => {
          this.error = this.api.getErrorMessage(reason);
          this.submitting = false;
        });
    }
  }

  private submitRequest(): Promise<ApiResponse<unknown>> {
    if (this.isCreateForm()) {
      return this.api.postHostBan(this.host, this.expires, this.notes);
    } else if (this.isDeleteForm()) {
      return this.api.deleteHostBan(this.existingId!);
    } else {
      return this.api.putHostBan(
        this.existingId!,
        this.host,
        this.expires,
        this.notes
      );
    }
  }

  private cancel(e: Event): void {
    killEvent(e);
    if (!this.submitting) {
      this.emit("cancel");
    }
  }

  private setRelativeExpiry(
    unit: "day" | "month" | "year" | "forever",
    count: number,
    e: Event
  ): void {
    killEvent(e);
    let expires: string;
    if (unit === "forever") {
      expires = FOREVER;
    } else {
      const date = new Date();
      date.setHours(0);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      if (unit === "day") {
        date.setDate(date.getDate() + count);
      } else if (unit === "month") {
        date.setMonth(date.getMonth() + count);
      } else if (unit === "year") {
        date.setFullYear(date.getFullYear() + count);
      } else {
        throw Error(`Unknown unit '${unit}'`);
      }
      const year = `0000${date.getFullYear()}`.slice(-4);
      const month = `0${date.getMonth() + 1}`.slice(-2);
      const day = `0${date.getDate()}`.slice(-2);
      expires = `${year}-${month}-${day}`;
    }
    this.expires = expires;
    // Date input's value is overly sticky, so we have to force it here.
    const elem = this.querySelector("input[name=expires]") as HTMLInputElement;
    elem.value = expires;
  }

  protected override render(): RenderResult {
    const isCreate = this.isCreateForm();
    const isDelete = this.isDeleteForm();
    const isReadonly = this.submitting || isDelete;
    const canSubmit =
      !this.submitting &&
      (isDelete ||
        (this.host?.trim()?.length && this?.expires?.trim()?.length));
    return html`
      ${this.renderHeading()}
      <form @submit="${this.submit}">
        <label>
          Server
          <input
            type="text"
            name="host"
            value="${this.host}"
            @change="${this.bindInput("host")}"
            @keyup="${this.bindInput("host")}"
            readonly="${isReadonly || nothing}"
            disabled="${isDelete || nothing}"
            required="${!isDelete || nothing}"
            autofocus="${!isDelete || nothing}"
          />
          ${isDelete
            ? nothing
            : html`<small>Host or IP address to ban.</small>`}
        </label>
        <label> Expires ${this.renderExpires()} </label>
        <label>
          Notes
          <input
            type="text"
            name="notes"
            value="${this.notes}"
            @change="${this.bindInput("notes")}"
            @keyup="${this.bindInput("notes")}"
            readonly="${this.submitting || nothing}"
            disabled="${isDelete || nothing}"
          />
          ${isDelete
            ? nothing
            : html`<small>Optional reason for the ban.</small>`}
        </label>
        ${this.renderErrorOrNote()}
        <div class="grid">
          <button
            type="submit"
            disabled="${!canSubmit || nothing}"
            aria-busy="${this.submitting || nothing}"
          >
            ${this.submitting
              ? isCreate
                ? "Creating…"
                : isDelete
                ? "Deleting…"
                : "Updating…"
              : isCreate
              ? "Create"
              : isDelete
              ? "Delete"
              : "Update"}
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

  private renderHeading(): RenderResult {
    if (this.isCreateForm()) {
      return html`<h3>Create Ban</h3>`;
    } else if (this.isDeleteForm()) {
      return html`<hgroup>
        <h3>Delete Ban</h3>
        <h4>Are you sure you want to delete this ban?</h4>
      </hgroup>`;
    } else {
      return html`<h3>Edit Ban</h3>`;
    }
  }

  private renderExpires(): RenderResult {
    if (this.isDeleteForm()) {
      return html`
        <input
          type="text"
          name="expires"
          value="${formatDate(new Date(this.expires))}"
          disabled
        />
      `;
    } else {
      return html`
        <div class="grid">
          <input
            type="date"
            name="expires"
            value="${this.expires}"
            @change="${this.bindInput("expires")}"
            @keyup="${this.bindInput("expires")}"
            readonly="${this.submitting || nothing}"
            required
          />
          <details role="list">
            <summary aria-haspopup="listbox">Relative</summary>
            <ul role="listbox">
              <li>
                <a
                  href="#"
                  @click="${this.setRelativeExpiry.bind(this, "day", 1)}"
                >
                  1 Day
                </a>
              </li>
              <li>
                <a
                  href="#"
                  @click="${this.setRelativeExpiry.bind(this, "day", 3)}"
                >
                  3 Days
                </a>
              </li>
              <li>
                <a
                  href="#"
                  @click="${this.setRelativeExpiry.bind(this, "day", 7)}"
                >
                  1 Week
                </a>
              </li>
              <li>
                <a
                  href="#"
                  @click="${this.setRelativeExpiry.bind(this, "day", 14)}"
                >
                  2 Weeks
                </a>
              </li>
              <li>
                <a
                  href="#"
                  @click="${this.setRelativeExpiry.bind(this, "day", 21)}"
                >
                  3 Weeks
                </a>
              </li>
              <li>
                <a
                  href="#"
                  @click="${this.setRelativeExpiry.bind(this, "month", 1)}"
                >
                  1 Month
                </a>
              </li>
              <li>
                <a
                  href="#"
                  @click="${this.setRelativeExpiry.bind(this, "year", 1)}"
                >
                  1 Year
                </a>
              </li>
              <li>
                <a
                  href="#"
                  @click="${this.setRelativeExpiry.bind(this, "forever", 0)}"
                >
                  Permanent
                </a>
              </li>
            </ul>
          </details>
        </div>
        <small>
          Enter an expiry date for this ban or use the
          <em>Relative</em> selection to pick a timespan. For permanent bans,
          use the date ${formatDate(new Date(FOREVER))}.
        </small>
      `;
    }
  }

  private renderErrorOrNote(): RenderResult {
    if (this.error) {
      return html`<p class="error"><strong>Error:</strong> ${this.error}</p>`;
    } else if (this.isDeleteForm()) {
      return nothing;
    } else {
      return html`<p>
        <strong>Note:</strong> Banning a host will <em>not</em> automatically
        unlist its currently listed sessions.
      </p>`;
    }
  }
}
