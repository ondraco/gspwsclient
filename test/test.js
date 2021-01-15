function test() {
  let host = 'wss://127.0.0.1:443/API';
  let key = 'rOG6t8kqkyY=';
  let gws = new GspWs(host, key);
  gws.connect(host);
}
