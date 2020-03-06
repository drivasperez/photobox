import { render } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { html } from "htm/preact";

function useIntersectionObs({ root = null, rootMargin, threshold = 0 }) {
  const [info, updateInfo] = useState({});
  const [node, setNode] = useState(null);

  const observer = useRef(null);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      ([entry]) => updateInfo(entry),
      {
        root,
        rootMargin,
        threshold,
      }
    );

    const { current: currentObserver } = observer;

    if (node) currentObserver.observe(node);

    return () => {
      currentObserver.disconnect();
    };
  }, [node, root, rootMargin, threshold]);

  return [{ ref: setNode }, info];
}

function Img({ src, sm, md, lg, alt, aspectRatio, bg }) {
  const [wasVisible, setWasVisible] = useState(false);
  const [{ ref }, { isIntersecting }] = useIntersectionObs({});

  useEffect(() => {
    if (isIntersecting) setWasVisible(true);
  }, [isIntersecting]);

  return html`
    <div
      ref=${ref}
      class="relative bg-orange-400"
      style="padding-top: ${aspectRatio}%; background: url(data:image/gif;base64,${bg}); background-size: 100% 100%; background-repeat: no-repeat;"
    >
      ${wasVisible &&
        html`
          <picture>
            <source srcset=${lg} media="(min-width: 1200px)" />
            <source srcset=${md} media="(min-width: 800px)" />
            <source srcset=${sm} />
            <img
              class="absolute left-0 top-0 fader"
              style="width: 100%; height: 100%"
              alt=${alt}
              src=${src}
            />
          </picture>
        `}
    </div>
  `;
}

const lazyElements = document.getElementsByClassName("lazy");

for (const elem of lazyElements) {
  const alt = elem.getAttribute("data-alt");
  const src = elem.getAttribute("data-src");
  const sm = elem.getAttribute("data-sm");
  const md = elem.getAttribute("data-md");
  const lg = elem.getAttribute("data-lg");
  const aspectRatio = elem.getAttribute("data-aspect");
  const bg = elem.getAttribute("data-bg");

  render(
    html`
      <${Img}
        alt=${alt}
        sm=${sm}
        md=${md}
        lg=${lg}
        src=${src}
        bg=${bg}
        aspectRatio=${aspectRatio}
      />
    `,
    elem
  );
}
