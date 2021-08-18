window.onload = (event) => {
    var input = document.getElementById('audioInput');
    input.addEventListener("input", processInput);
    view_results();
    // view_chooseOptions();
};

var fileToSend = '';
var objectKey = '';
var urlOfSplitter = 'https://uhuikcje97.execute-api.us-east-1.amazonaws.com/default/song-splitter-image-function';
var numberTracks = '';

function processInput(event) {
    console.log("event happened");
    console.log(event);
    files = this.files;
    file = URL.createObjectURL(files[0]);
    console.log("this is file", file);
    document.getElementById('originalAudioId').setAttribute('data-src', file);
    console.log(file);
    fileToSend = files[0];
    var fileType = fileToSend.type;
    beginUpload(fileType);
    // uploadAndRunAI(fileToSend);
    view_chooseOptions();
};

async function checkExistsThenUpdate(allUrls) {
    var check = '';
    if (numberTracks == '2') {
        var check = await checkIfFileExistsYet(allUrls['vocals']);
    }
    if (numberTracks == '4') {
        var check = await checkIfFileExistsYet(allUrls['other']);
    }
    if (numberTracks == '5') {
        var check = await checkIfFileExistsYet(allUrls['piano']);
    }
    if (check["status"] == 403) {
        console.log("it doesn't exist yet");
        await new Promise(r => setTimeout(r, 2000));
        checkExistsThenUpdate(allUrls);
    } else {
        console.log("the last files exists");
        updateAudioElements(allUrls);
        return;
    }
}

async function runAI() {
    view_loading();
    var tracks = document.getElementsByName('tracks')[0].value;
    var outputFormat = document.getElementsByName('outputFormat')[0].value;
    numberTracks = tracks;
    console.log('tracks', tracks);
    console.log('outputFormat', outputFormat);

    var splitOptions = {
        'tracks': tracks,
        'outputFormat': outputFormat,
        'objectKey': objectKey
    }

    var objectKeyNameOnly = objectKey.split(".")[0];
    var s3BucketURL = 'https://song-splitter-bucket.s3.amazonaws.com/'
    var accompanimentURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/accompaniment${outputFormat}`;
    var vocalsURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/vocals${outputFormat}`;
    var bassURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/bass${outputFormat}`;
    var drumsURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/drums${outputFormat}`;
    var otherURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/other${outputFormat}`;
    var pianoURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/piano${outputFormat}`;

    var allUrls = {
        'accompaniment': accompanimentURL,
        'vocals': vocalsURL,
        'bass': bassURL,
        'drums': drumsURL,
        'other': otherURL,
        'piano': pianoURL,
    };

    var splitter = await runSplitter(urlOfSplitter, splitOptions);
    console.log("splitter response in main", splitter);
    if (splitter["status"] == 200) {
        updateAudioElements(allUrls);
    } else {
        await checkExistsThenUpdate(allUrls);
    }
}

async function getPresignedURL(fileType) {
    var presignedURL = '';
    var objectKey = '';
    await fetch("https://rvs3mygk4h.execute-api.us-east-1.amazonaws.com/default/getPresignedURL", {
        method: 'POST',
        body: JSON.stringify({ 'fileType': fileType })
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
            document.getElementById('uploadingBar').style.visibility = 'hidden';
            // view_loading();
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    return response;
}

async function runSplitter(url, options) {
    console.log("Running AI");
    // var objectKey = { 'objectKey': data };
    var splitterResponse = {};
    await fetch(url, {
        method: 'POST',
        body: JSON.stringify(options)
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
    var file = {};
    await fetch(url, { method: 'GET' })
        .then((response) => {
            console.log("checking response");
            file = response;
        })
        .then((result) => {
            console.log("checking result");
        })
        .catch((error) => {
            console.error("checking error", error);
        });
    return file
}

function updateAudioElements(allUrls) {
    console.log("updating audioElements");
    if (numberTracks == '2') {
        // set urls
        document.getElementById('vocalsId').setAttribute('data-src', allUrls['vocals']);
        document.getElementById('accompanimentId').setAttribute('data-src', allUrls['accompaniment']);
        // show audio players
        document.getElementById('playerAccompaniment').classList.remove('hideElement');
    }
    if (numberTracks == '4') {
        // set urls
        document.getElementById('vocalsId').setAttribute('data-src', allUrls['vocals']);
        document.getElementById('bassId').setAttribute('data-src', allUrls['bass']);
        document.getElementById('drumsId').setAttribute('data-src', allUrls['drums']);
        document.getElementById('otherId').setAttribute('data-src', allUrls['other']);
        // show audio players
        document.getElementById('playerBass').classList.remove('hideElement');
        document.getElementById('playerDrums').classList.remove('hideElement');
        document.getElementById('playerOther').classList.remove('hideElement');
    }
    if (numberTracks == '5') {
        // set urls
        document.getElementById('vocalsId').setAttribute('data-src', allUrls['vocals']);
        document.getElementById('bassId').setAttribute('data-src', allUrls['bass']);
        document.getElementById('drumsId').setAttribute('data-src', allUrls['drums']);
        document.getElementById('pianoId').setAttribute('data-src', allUrls['piano']);
        document.getElementById('otherId').setAttribute('data-src', allUrls['other']);
        // show audio players
        document.getElementById('playerBass').classList.remove('hideElement');
        document.getElementById('playerDrums').classList.remove('hideElement');
        document.getElementById('playerOther').classList.remove('hideElement');
        document.getElementById('playerPiano').classList.remove('hideElement');
    }
    view_results();
}


async function beginUpload(fileType) {
    console.log('beginning upload');
    params = await getPresignedURL(fileType);
    objectKey = params['objectKey'];
    var presignedURL = await params['presignedURL'];
    await uploadData(presignedURL, fileToSend);
}

async function download(audioId) {
    var url = document.getElementById(audioId).getAttribute('data-src');
    // var obj = await fetch(url);
    const blob = await (await fetch(url, {method: 'GET'})).blob();
    const blobUrl = URL.createObjectURL(blob);
    console.log(url);
    var element = document.createElement('a');
    element.setAttribute('href', blobUrl);
    element.setAttribute('download', audioId);
    element.click();
    element.remove();
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
    if (document.getElementById("droptarget").contains(event.target)) {
        console.log("yes it contains it!!!");
        document.getElementById("droptarget").style.background = "rgba(217, 217, 217, 0.75)";
        document.getElementById("insideDropTarget").style.zIndex = "-1";
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
    document.getElementById("droptarget").style.background = "";
    document.getElementById("insideDropTarget").style.zIndex = "";
    var data = event.dataTransfer.items[0].getAsFile();
    console.log(data);
    if (event.target.className == "droptarget") {
        file = URL.createObjectURL(data);
        console.log("this is file", file);
        document.getElementById('originalAudioId').setAttribute('data-src', file);
        fileToSend = data;
        var fileType = fileToSend.type;
        beginUpload(fileType);
        // uploadAndRunAI(data);
        view_chooseOptions();
    }
});






// soundcloud

// window.onload = (event) => {
//     var options = [];
//     var url = "https://song-splitter-bucket.s3.amazonaws.com/9775562882.mp3";
//     // var url = "https://soundcloud.com/songdonkey/accompaniment";
//     var widget = document.getElementById("soundcloudWidget");
//     SC.Widget(widget).setVolume(10);
//     SC.Widget(widget).load(url, options);
//     console.log('page is fully loaded');
// };

function view_begin() {

}
function view_chooseOptions() {
    document.getElementById('insideDropTarget').classList.add('hideElement');
    document.getElementById('insideDropTargetSecondPage').classList.remove('hideElement');
}
function view_loading() {
    document.getElementById('insideDropTargetSecondPage').classList.add('hideElement');
    document.getElementById('insideDropTargetThirdPage').classList.remove('hideElement');
}
function view_results() {
    document.getElementById('soundcloudExamples').classList.add("hideElement");
    document.getElementById('insideDropTargetThirdPage').classList.add('hideElement');
    document.getElementById('droptarget').classList.add('hideElement');
    document.getElementById('droptargetResult').classList.remove('hideElement');
}


// I need to use cloneNode(true) so that it copies the nested children
// but doing the state stuff and template can come with the speed improvement