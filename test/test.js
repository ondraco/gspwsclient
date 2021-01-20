let host = "wss://127.0.0.1:443/API";
let key = "rOG6t8kqkyY=";
let tagIds = [11, 21, 31, 100];
let gws;

$(function () {
  test();
});

function test() {
  gws = new GSPClient.WS(host, key);
  gws.addEventListener("error", onError);
  gws.addEventListener("ready", onReady);
  gws.addEventListener("tagValue", onNewValue);
  gws.connect(host);
}

function onNewValue(e) {
  $.each(e.detail, function (index, value) {
    console.log(" ID: " + value.tag + " TYPE: " + value.type + " VAL: " + value.val);
  });
}

function onReady(e) {
  gws.queryTagValues(tagIds);
}

function onError(e) {
  console.log(e);
}
