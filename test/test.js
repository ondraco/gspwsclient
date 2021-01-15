function test() {
  let host = "wss://127.0.0.1:443/API";
  let gws = new GspWs(host);
  gws.connect(host);
}
