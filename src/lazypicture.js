import { LitElement, html, css } from "lit-element";

class LazyPicture extends LitElement {
  static get properties() {
    return {
      class: { type: String },
      aspect: { type: Number },
      bg: { type: String },
      visible: { type: Boolean },
    };
  }

  static get styles() {
    return css`
      div {
        position: relative;
        background-size: 100% 100%;
        background-repeat: no-repeat;
      }
    `;
  }

  constructor() {
    super();
    this.class = "";
    this.aspect = 1;
    this.bg = "";
    this.visible = false;
  }

  firstUpdated() {
    super.firstUpdated();
    this._observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        this.visible = true;
      }
    }, {});
    this._observer.observe(this.shadowRoot.querySelector("#observed"));
  }

  disconnectedCallback() {
    this._observer.unobserve(this.shadowRoot.querySelector("#observed"));
    super.disconnectedCallback();
  }

  makeVisible() {
    this.visible = true;
  }

  render() {
    return html`
      <div
        id="observed"
        style="padding-top: ${this
          .aspect}%; background-image: url(data:image/gif;base64,${this.bg});"
      >
        <picture class=${this.class}>
          ${this.visible
            ? html`
                <slot></slot>
              `
            : html``}
        </picture>
      </div>
    `;
  }
}

customElements.define("lazy-picture", LazyPicture);
