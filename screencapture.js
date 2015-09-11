var screencapture = (function(root) {
	
	var $ = root.jQuery;
	var canvasImage = null;
	var IMAGE_TYPE = "image/png";

	return {
			counter : 0,
			click : function($dom) {
				LOG("click:function");
				var $def = $.Deferred();
				root.html2canvas($dom || document.body, {
          //allowTaint : true,
          proxy : "http://localhost:5000",
          background : undefined,
          useCORS : true,
					onrendered : function(canvas) {
						var cand = document.getElementsByTagName('canvas');
						if (cand[0] === undefined || cand[0] === null) {
						} else {
							document.body.removeChild(cand[0]);
						}
						canvas.style = "display:none;";
						document.body.appendChild(canvas);
						canvasImage = canvas;
						$def.resolve(canvas);
						canvas.remove();
					}
				});
				return $def.promise();
			},
			getDataURI : function(type){
				var cand = document.getElementsByTagName('canvas');
				return cand[0].toDataURL(type||IMAGE_TYPE);
			},
			toCanvasData : function(strDataURI,type){
				return strDataURI.replace('data:' + (type||IMAGE_TYPE) + ';base64,', '');
			},
			getCanvasData : function(type){
				return this.toCanvasData(this.getDataURI(type),type);
			},
			convertToBinary : function(_options){
				var options = _options || {};
				options.type = options.type || IMAGE_TYPE;
				options.fileparam =  options.fileparam || "file";
				options.filename = options.filename || (new Date()).getTime()+"-"+(++screencapture.counter) + ".png";
				
				canvasData = options.canvasData || screencapture.getCanvasData(options);

				var boundary = options.boundary || 'ohaiimaboundary';
				var dataList = [
				    '--' + boundary,
				    'Content-Disposition: form-data; name="'+options.fileparam+'"; filename="' + options.filename + '"',
				    'Content-Type: ' + options.type,
				    '',
				    atob(canvasData),
				];
				
				options.data = options.data || {};
				
				options.data.filename = options.data.filename || options.filename;
					
				for(var i in options.data){
					dataList.push(		
						'--' + boundary,
						'Content-Disposition: form-data; name="'+ i +'"',
					    '',
					    options.data[i]
				    );
				}
				dataList.push('--' + boundary + '--');
				var bytes = Array.prototype.map.call( dataList.join('\r\n'), function(c) {
					return c.charCodeAt(0) & 0xff;
				});
				return new Uint8Array(bytes).buffer;
			},
			post : function(_options){
				var options = _options || {};
				options.data = screencapture.convertToBinary(options);
        //console.error("options",options)
				options.url = options.url || '/app/upload';
				options.boundary = options.boundary || 'ohaiimaboundary';
				return screencapture.sendMultiPartData(options);
			},
			sendMultiPartData : function(options) {
				var $def = $.Deferred();
				var xhr = new XMLHttpRequest();
				xhr.open("POST", options.url,true);
				xhr.setRequestHeader(
				    'Content-Type', 'multipart/form-data; boundary=' + options.boundary);
				xhr.addEventListener("load", function() {
					switch (this.status) {
			          case 200: // request complete and successful
			            var data = JSON.parse(xhr.responseText);
			            $def.resolve(data,options);
			            break;
			          default: // request complete but with unexpected response
			          	  $def.reject({
			                  type: "error", code : this.status,
			                  msg: "File was not uploaded due to unknown errors"
			               },options);
					}
			  	}, false);
		      	xhr.onreadystatechange = function() {
		          if (this.readyState === 4 && this.status === 0) {
		        	  $def.reject({
		                  type: "error",
		                  msg: "File was not uploaded due to unknown errors"
		               },options);
		          }
		        };
		        xhr.upload.addEventListener("progress", function(event) {
		          console.info(event);
              $def.notify(event);
		        }, false);

		        xhr.send(options.data);
		        return $def.promise();
			}
			
	};

})(this);