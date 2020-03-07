import { render } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { html } from "htm/preact";

function useMedia(query) {
  const [state, setState] = useState(matchMedia(query).matches);
  useEffect(() => {
    const handler = () => setState(matchMedia(query).matches);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
    };
  }, [query]);
  return state;
}

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

function Img({ xs, sm, md, lg, alt, aspectRatio, bg }) {
  const [wasVisible, setWasVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [{ ref }, { isIntersecting }] = useIntersectionObs({});

  useEffect(() => {
    if (isIntersecting) setWasVisible(true);
  }, [isIntersecting]);

  const isLg = useMedia("(min-width: 1200px)");
  const isMd = useMedia("(min-width: 800px)");
  const isSm = useMedia("(min-width: 600px)");
  const isXs = useMedia("(min-width: 400px)");

  useEffect(() => {
    let current = true;

    if (!hasLoaded && wasVisible) {
      const img = new Image();
      img.onload = function() {
        if (current) {
          setHasLoaded(true);
        }
      };
      if (isLg) {
        img.src = lg;
      } else if (isMd) {
        img.src = md;
      } else if (isSm) {
        img.src = sm;
      } else {
        img.src = xs;
      }
    }

    return () => {
      current = false;
    };
  });

  return html`
    <div
      ref=${ref}
      class="relative"
      style="padding-top: ${aspectRatio}%; background: url(data:image/gif;base64,${bg}); background-size: 100% 100%; background-repeat: no-repeat;"
    >
      ${hasLoaded &&
        html`
          <picture>
            <source srcset=${lg} media="(min-width: 1200px)" />
            <source srcset=${md} media="(min-width: 800px)" />
            <source srcset=${sm} media="(min-width: 600px)" />
            <source srcset=${xs} media="(min-width: 400px)" />
            <img
              class="absolute w-full h-full left-0 top-0 fader"
              style="width: 100%; height: 100%"
              alt=${alt}
              src=${lg}
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
  const xs = elem.getAttribute("data-xs");
  const sm = elem.getAttribute("data-sm");
  const md = elem.getAttribute("data-md");
  const lg = elem.getAttribute("data-lg");
  const aspectRatio = elem.getAttribute("data-aspect");
  const bg = elem.getAttribute("data-bg");

  render(
    html`
      <${Img}
        alt=${alt}
        xs=${xs}
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
