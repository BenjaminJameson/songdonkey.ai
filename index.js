audio_file.onchange = function () {
    files = this.files;
    file = URL.createObjectURL(files[0]);
    audio_player.src = file;
    console.log(file);
    var fileToSend = files[0];

    uploadAndRunAI(fileToSend);
};

async function checkExistsThenUpdate(accompanimentURL, vocalsURL) {
    var accompaniment = await checkIfFileExistsYet(accompanimentURL);
    var vocals = await checkIfFileExistsYet(vocalsURL);
    if (accompaniment["status"] == 403 || vocals["status"] == 403) {
        console.log("it doesn't exist yet");
        await new Promise(r => setTimeout(r, 2000));
        checkExistsThenUpdate(accompanimentURL, vocalsURL);
    } else {
        console.log("both files exist!!!", accompaniment["status"], vocals["status"]);
        updateAudioElements(accompanimentURL, vocalsURL);
        return;
    }
}

async function uploadAndRunAI(fileToSend) {
    var urlOfSplitter = 'https://uhuikcje97.execute-api.us-east-1.amazonaws.com/default/song-splitter-image-function';
    params = await getPresignedURL();
    var presignedURL = params['presignedURL'];
    var objectKey = params['objectKey'];
    await uploadData(presignedURL, fileToSend);


    var objectKeyNameOnly = objectKey.split(".")[0];
    var s3BucketURL = 'https://song-splitter-bucket.s3.amazonaws.com/'
    var accompanimentURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/accompaniment.wav`;
    var vocalsURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/vocals.wav`;

    var splitter = await runSplitter(urlOfSplitter, objectKey);
    console.log("splitter response in main", splitter);
    if (splitter["status"] == 200) {
        updateAudioElements(accompanimentURL, vocalsURL);
    } else {
        await checkExistsThenUpdate(accompanimentURL, vocalsURL);
    }
}

async function getPresignedURL() {
    var presignedURL = ''
    var objectKey = ''
    await fetch("https://rvs3mygk4h.execute-api.us-east-1.amazonaws.com/default/getPresignedURL", {
        method: 'GET',
    })
        .then((response) => response.json())
        .then((result) => {
            console.log('Success:', result);
            presignedURL = result["uploadURL"];
            objectKey = result["audioFilename"];
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    var params = { 'presignedURL': presignedURL, 'objectKey': objectKey }
    return params
}

async function uploadData(url = '', data) {
    var response = await fetch(url, {
        method: 'PUT',
        body: data
    })
        .then((response) => {
            console.log('response:', response);
        })
        .then((result) => {
            console.log('Success:', result);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    return response;
}

async function runSplitter(url, data) {
    console.log("Running AI");
    var objectKey = { 'objectKey': data };
    var splitterResponse = {};
    await fetch(url, {
        method: 'POST',
        body: JSON.stringify(objectKey)
    })
        .then((response) => {
            console.log("run splitter response", response);
            splitterResponse = response;
        })
        .then((result) => {
            namesOfResultFiles = result;
            console.log('Success: run splitter result', result);
        })
        .catch((error) => {
            console.error('Error: run splitter error', error);
        });
    return splitterResponse
}

async function checkIfFileExistsYet(url) {
    var file = {}
    await fetch(url, { method: 'GET' })
        .then((response) => {
            console.log("checking response", response);
            file = response;
        })
        .then((result) => {
            console.log("checking result", result);

        })
        .catch((error) => {
            console.error("checking error", error);
        });
    return file
}

function updateAudioElements(accompanimentURL, vocalsURL) {
    console.log("updating audioElements");
    document.getElementById("accompaniment").src = accompanimentURL;
    document.getElementById("vocals").src = vocalsURL;
}






/* Events fired on the drag target */

// document.addEventListener("dragstart", function (event) {
//     console.log("dragstart");
//     // The dataTransfer.setData() method sets the data type and the value of the dragged data
//     event.dataTransfer.setData("Text", event.target.id);

//     // Output some text when starting to drag the p element
//     document.getElementById("demo").innerHTML = "Started to drag the p element.";

//     // Change the opacity of the draggable element
//     event.target.style.opacity = "0.4";
// });

// While dragging the p element, change the color of the output text
document.addEventListener("drag", function (event) {
    // console.log("drag");
    document.getElementById("demo").style.color = "red";
});

// Output some text when finished dragging the p element and reset the opacity
document.addEventListener("dragend", function (event) {
    document.getElementById("demo").innerHTML = "Finished dragging the p element.";
    event.target.style.opacity = "1";
});

/* Events fired on the drop target */

// When the draggable p element enters the droptarget, change the DIVS's border style
document.addEventListener("dragenter", function (event) {
    console.log("dragenter");
    console.log(event.target);
    if (event.target.className == "droptarget") {
        document.getElementById("droptarget").style.background = "rgba(217, 217, 217, 0.75)";
        document.getElementById("insideDropTarget").style.zIndex = "-1";
        console.log("drop target");
    }
});

// By default, data/elements cannot be dropped in other elements. To allow a drop, we must prevent the default handling of the element
document.addEventListener("dragover", function (event) {
    // console.log("dragover");
    event.preventDefault();
});

// When the draggable p element leaves the droptarget, reset the DIVS's border style
document.addEventListener("dragleave", function (event) {
    if (event.target.className == "droptarget") {
        document.getElementById("droptarget").style.background = "";
        document.getElementById("insideDropTarget").style.zIndex = "";
    }
});

/* On drop - Prevent the browser default handling of the data (default is open as link on drop)
   Reset the color of the output text and DIV's border color
   Get the dragged data with the dataTransfer.getData() method
   The dragged data is the id of the dragged element ("drag1")
   Append the dragged element into the drop element
*/
document.addEventListener("drop", function (event) {
    event.preventDefault();
    console.log("DROPPPPPED");
    var data = event.dataTransfer.items[0].getAsFile();
    console.log(data);
    if (event.target.className == "droptarget") {
        uploadAndRunAI(data);
    }
});