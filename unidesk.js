var unidesk = (function (root, uniwall) {

  var $ = root.jQuery;

  var domain = "http://staging.unidesk.in";
  var pathName = "/client?#/client/issuelist"
  var $container = null, token,addData;
  var hostDomain;
  var UniWallPopup;


  var registerHandler = function (name, handler) {
    uniwall[name] = function (data) {
      return xdm.send(name, data);
    };
    xdm.on(name, handler);
  };

  function popitup(url, windowName) {
    // UniWallPopup = window.open(url,windowName,'height=700,width=600,location=no,menubar=no,toolbar=no');
    //LOG("postMessage:domainInfo",UniWallPopup)
    // UniWallPopup.postMessage({ eventName : "_isWindowReady_", parentDomain: document.domain }, domain);
    ($container || $("body")).append("<iframe src=" + domain + pathName+ "/>");

    return false;
  }

  uniwall._isWindowReady_ = function (resp) {
    console.info("MyDomain:", document.domain, resp);
  };

  uniwall.open = function (options) {
    if (options) {
      domain = options.domain || domain;
      $container = options.$container || $container;
      token = options.token || token;
      addData = options.data || {};
      uniwall.$capture = options.$capture ? jQuery(options.$capture[0]) : document.getElementsByTagName("body")[0];
    }
    popitup(domain + pathName, "uniwall");
  };

  registerHandler("getToken", function () {
    return token;
  });
  registerHandler("getData", function () {
    return addData;
  });

  registerHandler("capture_screen", function (options) {
    var _options = options || {};
    var showHide  = jQuery.contains( uniwall.$capture, $container )
    if(showHide){
      $container.hide();
    }
    var height = uniwall.$capture.height();
    //uniwall.$capture.height("100%");
    var dff = root.screencapture.click(uniwall.$capture[0]).then(function () {
      if(showHide) $container.show();
      //uniwall.$capture.height(height);
      return root.screencapture.getDataURI(_options.type);
    });
    return dff;
  });

  uniwall.post = function (image, info) {
    screencapture.post({
      canvasData: image,
      data: info
    });
  };

  uniwall.on = function(){
    return xdm.on.apply(xdm,arguments);
  };
  uniwall.send = function(){
    return xdm.send.apply(xdm,arguments);
  };

  uniwall.capture_parent_screen = function () {
    return this.capture_screen();
  };

  return uniwall;
})(this, {});