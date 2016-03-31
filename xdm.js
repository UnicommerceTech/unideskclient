var XDMLOG = function(){
  return console.error.apply(console,["XDM",window.location.origin].concat([].slice.apply(arguments)));
};
var LOG = LOG || XDMLOG

var xdm = (function (root, xdm) {

  var hostDomain = "*";
  var callback_counter = 0;
  var EXPIRY_TIME = 5000, TIMEOUT_STATUS = "TIMED_OUT", XDM_PREFIX = "XDM#";
  var _readyInterval_ = null, cleanTimer;
  var callback_counter = 0;
  var callBackMap = {};
  var XDM = {};
  var executController;

  function url_domain(data) {
    var a = document.createElement('a');
    a.href = data;
    return a.origin;
  }

  xdm.setup = function () {
    if (root.addEventListener) {
      root.addEventListener("message", xdm._onMessage, false);
    } else if (root.attachEvent) {
      root.attachEvent("onmessage", xdm._onMessage);
    }
    if(window.location != window.parent.location){
      //document.referrer.indexOf(document.location.origin) !== 0
      if(document.referrer !== "" && document.referrer.indexOf(document.location.origin) !== 0){
        hostDomain = document.referrer;
      } else if(document.location.ancestorOrigins && document.location.ancestorOrigins.length){
        hostDomain = document.location.ancestorOrigins[document.location.ancestorOrigins.length-1];
      }
      //XDMLOG("hostDomain",hostDomain);
    }
  };

  xdm.events = {};
  xdm._onMessage = function (JSEventObject) { //THIS FUNCTION SIMPLY PROCESSES ANY MESSAGE RECIEVED FROM PARENT WINDOW by calling handlers
    var XDMEventObject = (typeof JSEventObject.data == "string") ? JSON.parse(JSEventObject.data) : JSEventObject.data;
    var XDMEventName = XDMEventObject.XDMEventName;
    XDMLOG("_onMessage",XDMEventObject);
    if (xdm.events[XDMEventName]) {
      for (var i in xdm.events[XDMEventName])
        xdm.events[XDMEventName][i](XDMEventObject.message, XDMEventObject, JSEventObject); // mainMessage, XDMEventObject, JSEventObject
    }
    if (executController && XDMEventName && XDMEventName.indexOf(XDM_PREFIX) === 0) {
      executController(XDMEventName, XDMEventObject.message, XDMEventObject, JSEventObject);
    }
  };
  xdm.onMessage = function (XDMEventName, callback) {  ////THIS FUNCTION Sets Handlers for any message
    if (xdm.events[XDMEventName] == undefined)  xdm.events[XDMEventName] = [];
    xdm.events[XDMEventName].push(callback);
  };


  xdm.postMessage = function (XDMEventName, message, destinationFrame, destinationURL) {  //THIS FUNCTION SIMPLY SENDS A MESSAGE/JSON object TO PARENT WINDOW:
    if (typeof destinationFrame === "string") {
      destinationURL = destinationFrame;
      destinationFrame = null;
    }
    destinationFrame = destinationFrame || root.opener || root.parent;

    //XDMLOG(destinationFrame.location.hostname,root.opener.location.hostname,root.parent.location.hostname)
    if(root.parent == destinationFrame){
      //XDMLOG("I AM parent",root.opener);
    }

    var messageid = XDM_PREFIX + (callback_counter++);
    try {
      var destURL;
      try {
        destURL = destinationURL || destinationFrame.location.href || hostDomain;
      } catch (e) {
        destURL = hostDomain;
        //XDMLOG("hostDomain::::",destURL);
      }

      var XDMEventObjectString = JSON.stringify({
        XDMEventName: XDMEventName,
        message: message,
        frameURL: document.URL,
        origin: window.location.hostname,
        destinationURL: destURL,
        windowName: window.windowName,
        windowID: root.windowID,
        messageid: messageid
      });

      //XDMLOG("postMessage",destURL,XDMEventObjectString);

      destinationFrame.postMessage(XDMEventObjectString, destURL);
      return messageid;
    } catch (err) {
      console.error("XDM:ERROR:FRAMEURL", document.URL, err);
    }
  };
  xdm.postMessageByFrameId = function (XDMEventName, message, destFrameID) {
    var o = document.getElementById(destFrameID);
    if (o) {
      var destinationFrame = o.contentWindow;
      //o.contentWindow.postMessage('Hello B', 'http://documentB.com/');
      xdm.postMessage(XDMEventName, message, destinationFrame, o.src);
      return true;
    }
    return false;
  };

  if (root.jQuery) {

    xdm.send = function (eventName, eventData, destinationFrame, URL) {
      var dff = jQuery.Deferred();
      var callback_counterID = xdm.postMessage(XDM_PREFIX + eventName, eventData, destinationFrame, URL);
      callBackMap[callback_counterID] = dff;
      callBackMap[callback_counterID].expiryTime = (new Date()).getTime() + EXPIRY_TIME;
      return dff.promise();
    };
    xdm.on = function (eName, handler) {
      XDM[XDM_PREFIX + eName] = handler;
      return this;
    };

    executController = function (XDMEventName, XDMEventMessage, XDMEventObject, JSEventObject) {
      var eName = XDMEventName;//.split(XDM_PREFIX)[1];
      if (typeof XDM[eName] == 'function') {
        jQuery.when(
          XDM[eName](XDMEventMessage, XDMEventObject, JSEventObject)
        ).done(function (resp) {
            if (XDMEventObject.messageid) {
              xdm.postMessage(XDMEventObject.messageid, resp, JSEventObject.source);
              //event.source.postMessage({ eventName: XDMEventObject.messageid , eventData : resp },domain);
            }
          });
      }
      if (callBackMap[XDMEventName]) {
        callBackMap[XDMEventName].resolve(XDMEventMessage);
        xdm.clean();
      }
    };

    xdm.clean = function () {
      var self = this;
      root.clearTimeout(cleanTimer);
      cleanTimer = root.setTimeout(function () {
        try {
          var timeNow = (new Date()).getTime();
          for (var cbID in callBackMap) {
            if (callBackMap[cbID]) {
              if (callBackMap[cbID].state() === 'rejected' || callBackMap[cbID].state() === 'resolved') {
                delete callBackMap[cbID];
              } else if (callBackMap[cbID].expiryTime !== undefined && callBackMap[cbID].expiryTime < timeNow) {
                callBackMap[cbID].reject(callBackMap[cbID], TIMEOUT_STATUS, new Error("Request Timedout", TIMEOUT_STATUS));
              }
            }
          }
        } catch (e) {
          console.error("Exception occured while resolving requests", e);
        }
      }, EXPIRY_TIME);
    };
  }
  xdm.setup();
  return xdm;
})(this, {});
