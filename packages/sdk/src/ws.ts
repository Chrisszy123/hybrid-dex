export class WSClient {
  private ws: WebSocket | null = null;

  connect(url: string) {
    this.ws = new WebSocket(url);
    return this.ws;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

