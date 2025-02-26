import { clearStoredAuth } from "./auth";

const SESSION_TIMEOUT = 3 * 60 * 60 * 1000;

export class SessionManager {
  private timeoutId: number | null = null;
  private lastActivity: number = Date.now();
  private readonly onTimeout: () => void;

  constructor(onTimeout: () => void) {
    this.onTimeout = onTimeout;
    this.resetTimer();

    window.addEventListener("mousemove", this.handleActivity);
    window.addEventListener("mousedown", this.handleActivity);
    window.addEventListener("keypress", this.handleActivity);
    window.addEventListener("scroll", this.handleActivity);
    window.addEventListener("touchmove", this.handleActivity);
  }

  private handleActivity = (): void => {
    this.lastActivity = Date.now();
    this.resetTimer();
  };

  private resetTimer(): void {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;

      if (timeSinceLastActivity >= SESSION_TIMEOUT) {
        this.handleTimeout();
      } else {
        const remainingTime = SESSION_TIMEOUT - timeSinceLastActivity;
        this.timeoutId = window.setTimeout(() => this.handleTimeout(), remainingTime);
      }
    }, SESSION_TIMEOUT);
  }

  private handleTimeout(): void {
    clearStoredAuth();
    this.onTimeout();
  }

  public cleanup(): void {
    window.removeEventListener("mousemove", this.handleActivity);
    window.removeEventListener("mousedown", this.handleActivity);
    window.removeEventListener("keypress", this.handleActivity);
    window.removeEventListener("scroll", this.handleActivity);
    window.removeEventListener("touchmove", this.handleActivity);

    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export const setSessionStartTime = (): void => {
  localStorage.setItem("session_start_time", Date.now().toString());
};

export const checkSessionExpired = (): boolean => {
  const startTime = localStorage.getItem("session_start_time");
  if (!startTime) return true;

  const sessionStart = parseInt(startTime);
  const now = Date.now();
  return now - sessionStart > SESSION_TIMEOUT;
};
