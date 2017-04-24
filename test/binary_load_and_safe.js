var contentType = '';

  window.saveImage = function() {
    var textToWrite = document.getElementById("inputTextToSave").value;

    var splittedTextToWrite = textToWrite.split(",");

    var u16 = new Uint16Array(splittedTextToWrite.length);

      for(i=0; i<splittedTextToWrite.length; i++){
          u16[i]=splittedTextToWrite[i];
      }
    var textFileAsBlob = new Blob([u16], {type: contentType});          

    var fileNameToSaveAs = document.getElementById("inputFileNameToSaveAs").value;

    var downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = "Download File";
 
      // Firefox requires the link to be added to the DOM
      // before it can be clicked.
      downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
      downloadLink.onclick = destroyClickedElement;
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
    

    downloadLink.click();
  }

  function destroyClickedElement(event) {
    document.body.removeChild(event.target);
  }

  window.loadImage = function() {
    var file = document.getElementById("fileToLoad").files[0];

    var reader = new FileReader();
    reader.onload = function(event) {
      var data = event.target.result;

      var data16 = new Uint16Array(data);
      var text = [];
        for(i = 0; i<data16.length; i++){
            text.push(data16[i]);
        }

      document.getElementById("inputTextToSave").value = text;

      var imagePreview = document.getElementById("imagePreview");
      imagePreview.innerHTML = '';

      var dataURLReader = new FileReader();
      dataURLReader.onload = function(event) {
        // Parse image properties
        var dataURL = event.target.result;
        contentType = dataURL.split(",")[0].split(":")[1].split(";")[0];

        var image = new Image();
        image.src = dataURL;
        image.onload = function() {
          console.log("Image type: " + contentType);
          console.log("Image width: " + this.width);
          console.log("Image height: " + this.height);
          imagePreview.appendChild(this);
        };
      };
      dataURLReader.readAsDataURL(file);


    };
    //reader.readAsBinaryString(file);
    reader.readAsArrayBuffer(file);
  }
