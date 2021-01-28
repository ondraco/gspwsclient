let host = "wss://127.0.0.1:443/API";
let key = "rOG6t8kqkyY=";
let readTagIds = [100];
let newTagValues = [
  {
    tag: 101,
    val: "New value!",
  },
  {
    tag: 102,
    val: 0,
  },
  {
    tag: 103,
    val: 22,
  },
  {
    tag: 104,
    val: 222,
  },
  {
    tag: 105,
    val: 2222,
  },
  {
    tag: 106,
    val: 567.89,
  },
  {
    tag: 107,
    val: 1,
  },
  {
    tag: 108,
    val: 333,
  },
];
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
  gws.connect();
}

function onNewValue(e) {
  handled += e.length;

  if (speedTest) {
    gws.queryTagValues(tagIds);
  } else {
    $.each(e, function (index, value) {
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
  } else {
    gws.queryTagValues(readTagIds);
    //gws.setTagValues(newTagValues);
  }
}

function onError(e) {
  if (e !== undefined) {
    console.log("ERR:" + e.msg + " - " + e.detail);
  } else {
    console.log(e);
  }
}
