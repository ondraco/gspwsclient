function GspWs(url, key) {
  let _this = this;
  let socket;
  let authOk = false;

  const MsgId = {
    Authorize: 1,
    Get: 2,
    Set: 3,
    Sub: 4,
  };

  this.connect = function () {
    socket = new WebSocket(url, "gsp-protocol");
    {
      binaryType: "arraybuffer";
    }

    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMsg);
    socket.addEventListener("close", onClose);
    socket.addEventListener("error", onError);
  };

  function doAuth() {
    let headerLen = 8;
    let keySize = key.length * 2;

    var arr = new ArrayBuffer(headerLen + keySize);
    var view = new Uint16Array(arr, 0, 2);
    var keyView = new Uint16Array(arr, headerLen, key.length);

    view[0] = MsgId.Authorize;
    view[1] = key.length;

    for (var i = 0, strLen = key.length; i < strLen; i++) {
      keyView[i] = key.charCodeAt(i);
    }

    socket.send(arr);
  }

  function onOpen(event) {
    doAuth();
  }

  function onMsg(event) {}

  function onClose(event) {
    console.log(event);
  }

  function onError(event) {
    console.log(event);
  }
}
