import { LitElement, html, css } from "lit-element";

class LazyPicture extends LitElement {
  static get properties() {
    return {
      src: { type: String },
      alt: { type: String },
      class: { type: String },
      aspect: { type: Number },
      bg: { type: String },
      visible: { type: Boolean },
    };
  }

  static get styles() {
    return css`
      div {
        background-size: 100% 100%;
        background-repeat: no-repeat;
        position: relative;
      }

      img {
        position: absolute;
        width: 100%;
        height: 100%;
        left: 0;
        top: 0;
      }
    `;
  }

  constructor() {
    super();
    this.class = "";
    this.src = "";
    this.alt = "";
    this.aspect = 1;
    this.bg = "";
    this.visible = false;
  }

  firstUpdated() {
    super.firstUpdated();
    this._observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        this.makeVisible();
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
        ${this.visible
          ? html`
              <picture class=${this.class}>
                <slot></slot>
                <img src=${this.src} alt=${this.alt} />
              </picture>
            `
          : html``}
      </div>
    `;
  }
}

customElements.define("lazy-picture", LazyPicture);
