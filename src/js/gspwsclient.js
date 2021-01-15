function GspWs(url, key) {
  let _this = this;
  var socket;
  var ws_key;

  this.connect = function() {
    socket = new WebSocket(url);
    ws_key = key;

    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMsg);
  }

  function onOpen(event) {
    socket.send("Hello Server!");
  }

  function onMsg(event) {
    console.log("Message from server ", event.data);
  }
}
