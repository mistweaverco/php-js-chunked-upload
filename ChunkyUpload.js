/*jshint esversion: 6 */
var ChunkyUpload = function(opts) {
  'use strict';
  var _self = this,
      chunkyUpload,
      traverseFiles,
      Log;
  // Setting defaults for optional configuration parameters passed via the
  // `opts` argument.
  opts                             = opts || {};
  opts.maxChunkSizeInBytes         = opts.maxChunkSizeInBytes || 1024*100*10*1.5; // 1.5 MB
  opts.maxUploadRetries            = opts.maxUploadRetries || 5;
  opts.uploadRetryTimeoutInSeconds = opts.uploadRetryTimeoutInSeconds || 10;
  opts.uploadUrl                   = opts.uploadUrl || "upload";
  opts.fileInput                   = opts.fileInput || $('#fileInput').get(0);
  opts.fileList                    = opts.fileList || $('#file-list').get(0);

  // If `opts.fileInput` is `undefined` or `null` we can safely assume, that
  // continuing makes no sense at all.
  if (!opts.fileInput) {
    window.console.error("`opts.fileInput` is",
      typeof opts.fileInput, ". Exiting now..");
    return;
  }

  chunkyUpload = function(file) {
    var loaded = 0;
    var step = opts.maxChunkSizeInBytes;
    var totalFailures = 0;
    var fileHash = null;
    // total size of file
    var total = file.size;
    // Current Chunk Index
    var currentChunkIndex = 1;
    // Total amount of Chunks
    var totalChunks = Math.ceil(total/opts.maxChunkSizeInBytes);
    // starting position
    var start = 0;
    var reader = new FileReader();
    // a single chunk in starting of step size
    var blob = file.slice(start, step);
    // reading that chunk. when it read it, onload will be invoked
    reader.readAsDataURL(blob);
    // create upload bar for file
    var progressBarTemplate = `
      <div>
        <div class="filename">${file.name}</div>
        <div class="progress">
          <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;">
            0%
          </div>
        </div>
      </div>`;
    var $uploadBar = $(progressBarTemplate);
    $('#file-list').append($uploadBar);
    var $progressBar = $uploadBar.find('.progress-bar');
    reader.onload = function(e) {
      var d = {
        fileChunk: e.target.result,
        fileHash: fileHash
      };
      $.ajax({
        url: opts.uploadUrl,
        type: "POST",
        headers: {
          "x-file-name": file.name,
          "x-file-chunks-current": currentChunkIndex,
          "x-file-chunks-total": totalChunks,
          "x-file-size": total
        },
        // processData: false,
        data: d // `d` is the chunk got by readAsBinaryString(...)
      }).done(function(r) { // if `d` is uploaded successfully then ->
        var nextStep;
        if (fileHash === null && r && r.data && r.data.fileHash) {
          fileHash = r.data.fileHash;
        } else if (r && r.success === false) {
          // show error message
          $uploadBar.remove();
          if (opts.onUploadFailure) {
            opts.onUploadFailure({
              fileName: file.name,
              serverResponse: r
            });
          }
          return;
        }
        // increase current chunk index
        currentChunkIndex++;
        // Reset failure counter
        totalFailures = 0;
        var percentUploaded = Math.ceil(100/totalChunks*currentChunkIndex);
        $progressBar.attr('aria-valuenow', percentUploaded);
        $progressBar.attr('style', 'width: ' +percentUploaded + '%');
        $progressBar.html(percentUploaded + '%');
        // increasing loaded which is being used as start position for next chunk
        loaded = (loaded + step);
        nextStep = (loaded + step);
        // If file is not completely uploaded
        if (loaded <= total) {
          // Getting next chunk
          if (nextStep <= total) {
            blob = file.slice(loaded, nextStep);
          } else {
            blob = file.slice(loaded, total);
          }
          // Reading it through file reader which will call onload again.
          // So it will happen recursively until file is completely uploaded.
          reader.readAsDataURL(blob);
        } else { // if file is uploaded completely
          loaded = total;
          $uploadBar.remove();
          if (opts.onUploadFinish) {
            opts.onUploadFinish({
              fileName: file.name
            });
          }
        }
      }).fail(function(r){ // if upload failed
        // Try `opts.maxUploadRetries` times to upload file even on failure
        if ((totalFailures++) < opts.maxUploadRetries) {
          setTimeout(function(){
            reader.readAsDataURL(blob);
          }, (opts.uploadRetryTimeoutInSeconds * 1000));
        } else { // if file upload has failed `opts.maxUploadRetries` times
          $uploadBar.remove();
          if (opts.onUploadFailure) {
            opts.onUploadFailure({
              fileName: file.name,
              maxRetries: opts.maxUploadRetries
            });
          }
        }
      });
    };
  };

  traverseFiles = function() {
    if (opts.fileInput && opts.fileInput.files) {
      var files, i, len;
      files = opts.fileInput.files;
      i     = 0;
      len   = files.length;
      for (; i < len; i++) {
        chunkyUpload(files[i]);
      }
    }
    else {
      if (opts.onNoFileApiSupport) {
        opts.onNoFileApiSupport();
      }
    }
  };
  if (opts.onFilesInputChange) {
    opts.fileInput.addEventListener("change", function() {
      opts.onFilesInputChange(this);
    }, false);
  }
  _self.startUpload = function() {
    traverseFiles();
  };
  _self.cancelUpload = function(id) {
  };
  _self.pauseUpload = function(id) {
  };
  _self.resumeUpload = function(id) {
  };
  return _self;
};

