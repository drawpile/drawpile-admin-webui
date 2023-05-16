// SPDX-License-Identifier: MIT
import { LitElement, PropertyValues, TemplateResult, nothing } from "lit";
import { property } from "lit/decorators.js";

export type RenderResult =
  | TemplateResult
  | string
  | typeof nothing
  | undefined
  | RenderResult[];

export abstract class DrawpileElement extends LitElement {
  protected override createRenderRoot(): Element | ShadowRoot {
    return this; // Screw the Shadow DOM, CSS can select elements fine.
  }

  protected bindCheckbox(key: keyof this): (e: Event) => void {
    return (e: Event) => {
      this[key] = (e.target as HTMLInputElement).checked as any;
    };
  }

  protected bindInput(key: keyof this): (e: Event) => void {
    return (e: Event) => {
      this[key] = (e.target as HTMLInputElement).value as any;
    };
  }

  protected bindRadio(key: keyof this): (e: Event) => void {
    return (e: Event) => {
      const elem = e.target as HTMLInputElement;
      if (elem.checked) {
        this[key] = elem.value as any;
      }
    };
  }

  protected bindSelect(key: keyof this): (e: Event) => void {
    return (e: Event) => {
      const elem = e.target as HTMLSelectElement;
      this[key] = elem.value as any;
    };
  }

  protected bindTextArea(key: keyof this): (e: Event) => void {
    return (e: Event) => {
      this[key] = (e.target as HTMLTextAreaElement).value as any;
    };
  }

  protected emit(type: string, detail?: any): void {
    this.dispatchEvent(
      detail === undefined
        ? new Event(type, { bubbles: true, composed: true })
        : new CustomEvent(type, {
            bubbles: true,
            composed: true,
            detail: detail,
          })
    );
  }
}

export abstract class DrawpilePageElement extends DrawpileElement {
  @property() path!: string;

  override connectedCallback(): void {
    super.connectedCallback();
    this.checkPath();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("path")) {
      this.checkPath();
    }
  }

  protected abstract checkPath(): void;
}
