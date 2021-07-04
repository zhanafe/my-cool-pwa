const styleContent = `
  :host {
    display: block;
  }

  button {
    display: block;
    width: 100%;
    height: 64px;
    font-size: 18px;
    color: #fff;
    background-color: hsl(234deg 91% 56%);
    border: 0;
    border-radius: 8px;
    user-select: none;
    cursor: pointer;
    transition: background-color 150ms;
  }

  button:hover {
    background-color: hsl(234deg 91% 60%);
  }

  button:disabled {
    opacity: 0.7;
    background-color: hsl(234deg 12% 36%);
    pointer-events: none;
    cursor: not-allowed;
  }
`;

const DENIED = 'denied';
const GRANTED = 'granted';
const DEFAULT = 'default';

class PushSubscription extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.button = document.createElement('button');
    this.button.type = 'button';

    const style = document.createElement('style');
    style.textContent = styleContent;

    this.shadowRoot.appendChild(style);
  }

  async connectedCallback() {
    if ('serviceWorker' in navigator && 'PushManager' in window && Notification.permission !== 'denied') {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription();
      this.setButtonState(subscription ? GRANTED : DEFAULT);
      this.button.addEventListener('click', this.onButtonClick);
    } else {
      this.setButtonState(DENIED);
    }

    this.shadowRoot.appendChild(this.button);
  }

  disconnectedCallback() {
    this.button.removeEventListener('click', this.onButtonClick);
  }

  setButtonState = (state) => {
    switch (state) {
      case DENIED: {
        this.button.disabled = true;
        this.button.textContent = '無法使用通知功能';
        break;
      }

      case GRANTED: {
        this.button.disabled = false;
        this.button.textContent = '取消通知';
        break;
      }

      case DEFAULT: {
        this.button.disabled = false;
        this.button.textContent = '開啟通知';
        break;
      }
    }
  };

  onButtonClick = async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await fetch('/unsubscribe', { method: 'DELETE' });
      this.setButtonState(DEFAULT);
    } else {
      const notificationPermission = await Notification.requestPermission();

      switch (notificationPermission) {
        case DENIED: {
          this.button.removeEventListener('click', this.onButtonClick);
          this.setButtonState(DENIED);
          break;
        }

        case GRANTED: {
          const applicationServerKey = await fetch('/key').then((res) => res.text());

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });

          await fetch('/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription.toJSON()),
            headers: {
              ['Content-Type']: 'application/json',
            },
          });

          this.setButtonState(GRANTED);
          break;
        }
      }
    }
  };
}

window.customElements.define('push-subscription', PushSubscription);
