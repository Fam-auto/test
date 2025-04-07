/*!
 * bulma-toast 2.4.2
 * (c) 2018-present @rfoel <rafaelfr@outlook.com>
 * Released under the MIT License.
 */

// UMD pattern: allows compatibility with various module systems
(function(global, factory) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    factory(exports);
  } else if (typeof define === "function" && define.amd) {
    define(["exports"], factory);
  } else {
    global = typeof globalThis !== "undefined" ? globalThis : global || self;
    factory(global.bulmaToast = {});
  }
})(this, function(exports) {
  'use strict';

  // Helper to merge object properties
  function mergeProps(target, ...sources) {
    sources.forEach(source => {
      if (source) {
        Object.keys(source).forEach(key => {
          Object.defineProperty(target, key, {
            value: source[key],
            enumerable: true,
            configurable: true,
            writable: true
          });
        });
      }
    });
    return target;
  }

  // Default toast options
  const defaults = {
    duration: 2000,
    position: "top-right",
    closeOnClick: true,
    opacity: 1,
    single: false,
    offsetTop: 0,
    offsetBottom: 0,
    offsetLeft: 0,
    offsetRight: 0,
    extraClasses: ""
  };

  let settings = { ...defaults }; // Current config
  let toastState = {}; // DOM tracking
  let customDoc = null;

  // Internal helpers
  function getDoc() {
    return customDoc ?? document;
  }

  function buildPositionStyle(position, offsetTop, offsetBottom, offsetLeft, offsetRight) {
    switch (position) {
      case "top-left":
        return `left:${offsetLeft}px;top:${offsetTop}px;text-align:left;align-items:flex-start;`;
      case "top-right":
        return `right:${offsetRight}px;top:${offsetTop}px;text-align:right;align-items:flex-end;`;
      case "top-center":
        return `top:${offsetTop}px;left:0;right:0;text-align:center;align-items:center;`;
      case "bottom-left":
        return `left:${offsetLeft}px;bottom:${offsetBottom}px;text-align:left;align-items:flex-start;`;
      case "bottom-right":
        return `right:${offsetRight}px;bottom:${offsetBottom}px;text-align:right;align-items:flex-end;`;
      case "bottom-center":
        return `bottom:${offsetBottom}px;left:0;right:0;text-align:center;align-items:center;`;
      case "center":
        return `top:0;left:0;right:0;bottom:0;flex-flow:column;justify-content:center;align-items:center;`;
    }
  }

  // Get or create the toast container
  function getContainer(appendTo, position, top, bottom, left, right) {
    if (toastState.position) return toastState.position;

    const container = getDoc().createElement("div");
    container.setAttribute("style", `
      width:100%;z-index:99999;position:fixed;pointer-events:none;display:flex;
      flex-direction:column;padding:15px;${buildPositionStyle(position, top, bottom, left, right)}
    `);
    appendTo.appendChild(container);
    toastState.position = container;
    return container;
  }

  // Reset toast system and target document
  function setDoc(doc) {
    Object.values(toastState).forEach(el => el.remove());
    toastState = {};
    customDoc = doc;
  }

  // Main toast creation function
  function toast(options) {
    if (!options.message) throw new Error("message is required");

    const config = mergeProps({}, settings, options);
    const toastElement = new Toast(config).element;
    const container = getContainer(
      config.appendTo || getDoc().body,
      config.position || settings.position,
      config.offsetTop,
      config.offsetBottom,
      config.offsetLeft,
      config.offsetRight
    );

    if (config.single) {
      while (container.lastElementChild) {
        container.removeChild(container.lastElementChild);
      }
    }

    container.appendChild(toastElement);
  }

  // Toast class
  class Toast {
    constructor(options) {
      this.options = options;
      this.element = this.buildElement();
      if (options.pauseOnHover) {
        this.timer = new Timer(() => this.destroy(), options.duration);
        this.element.addEventListener("mouseover", () => this.timer.pause());
        this.element.addEventListener("mouseout", () => this.timer.resume());
      } else {
        this.timer = new Timer(() => this.destroy(), options.duration);
      }
    }

    buildElement() {
      const el = getDoc().createElement("div");
      const classes = ["notification", this.options.extraClasses];
      let style = `width:auto;pointer-events:auto;display:inline-flex;white-space:pre-wrap;opacity:${this.options.opacity};`;

      // Animation in
      if (this.options.animate?.in) {
        const animIn = `animate__${this.options.animate.in}`;
        const speed = this.options.animate.speed ? `animate__${this.options.animate.speed}` : "animate__faster";
        classes.push("animate__animated", animIn, speed);
        this.onAnimationEnd(() => el.classList.remove(animIn));
      }

      // Dismiss button
      if (this.options.dismissible) {
        const close = getDoc().createElement("button");
        close.className = "delete";
        close.addEventListener("click", () => this.destroy());
        el.insertAdjacentElement("afterbegin", close);
      } else {
        style += "padding: 1.25rem 1.5rem;";
      }

      // Click to close
      if (this.options.closeOnClick) {
        el.addEventListener("click", () => this.destroy());
      }

      el.className = classes.join(" ");
      el.setAttribute("style", style);

      if (typeof this.options.message === "string") {
        el.insertAdjacentHTML("beforeend", this.options.message);
      } else {
        el.appendChild(this.options.message);
      }

      return el;
    }

    destroy() {
      if (this.options.animate?.out) {
        const animOut = `animate__${this.options.animate.out}`;
        this.element.classList.add(animOut);
        this.onAnimationEnd(() => {
          this.removeIfLast(this.element.parentNode);
          this.element.remove();
          delete toastState.position;
        });
      } else {
        this.removeIfLast(this.element.parentNode);
        this.element.remove();
        delete toastState.position;
      }
    }

    removeIfLast(parent) {
      if (parent && parent.children.length <= 1) parent.remove();
    }

    onAnimationEnd(callback) {
      const events = {
        animation: "animationend",
        OAnimation: "oAnimationEnd",
        MozAnimation: "mozAnimationEnd",
        WebkitAnimation: "webkitAnimationEnd"
      };

      for (const key in events) {
        if (this.element.style[key] !== undefined) {
          this.element.addEventListener(events[key], callback);
          break;
        }
      }
    }
  }

  // Simple timer with pause/resume
  class Timer {
    constructor(callback, delay) {
      this.callback = callback;
      this.remaining = delay;
      this.resume();
    }

    pause() {
      clearTimeout(this.timer);
      this.remaining -= new Date() - this.start;
    }

    resume() {
      this.start = new Date();
      clearTimeout(this.timer);
      this.timer = setTimeout(this.callback, this.remaining);
    }
  }

  // Public API
  exports.resetDefaults = () => { settings = { ...defaults }; };
  exports.setDefaults = opts => { settings = { ...defaults, ...opts }; };
  exports.setDoc = setDoc;
  exports.toast = toast;
  Object.defineProperty(exports, "__esModule", { value: true });
});
