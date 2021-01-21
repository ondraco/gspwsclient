let host = "wss://127.0.0.1:443/API";
let key = "rOG6t8kqkyY=";
let tagIds = [100];
let gws;
let handled = 0;
let start = 0;
let speedTest = false;

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
  handled += e.detail.length;

  if (speedTest) {
    gws.queryTagValues(tagIds);
  } else {
    $.each(e.detail, function (index, value) {
      console.log(
        "ID: " + value.tag + " TYPE: " + value.type + " VAL: " + value.val
      );
    });
  }
}

function doSpeedTest() {
  setInterval(function () {
    let delay = (Date.now() - start) / 1000;
    let rate = handled / delay;
    console.log("COUNT: " + handled + " RATE: " + rate + " tags/s");
  }, 1000);

  start = Date.now();
  gws.queryTagValues(tagIds);
}

function onReady(e) {
  if (speedTest) {
    doSpeedTest();
  } else gws.queryTagValues(tagIds);
}

function onError(e) {
  if (e.detail !== undefined) {
    console.log("ERR:" + e.detail.msg + " - " + e.detail.detail);
  } else {
    console.log(e);
  }
}
