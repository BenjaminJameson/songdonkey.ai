window.onload = (event) => {
    var input = document.getElementById('audioInput');
    input.addEventListener("input", processInput);
    // view_results();
    // view_error();
    // view_chooseOptions();
    // view_loading();
};

var fileToSend = '';
var objectKey = '';
// var urlOfSplitter = 'https://uhuikcje97.execute-api.us-east-1.amazonaws.com/default/song-splitter-image-function';
var numberTracks = '';
var audioFileSizeMB;
var audioLengthMinutes;


function processInput(event) {
    console.log(event);
    files = this.files;
    //check the file type by file name
    console.log(files[0]['name'].split('.')[files[0]['name'].split('.').length - 1])
    if (files[0]['name'].split('.')[files[0]['name'].split('.').length - 1] != 'mp3' && files[0]['name'].split('.')[files[0]['name'].split('.').length - 1] != 'wav') {
        console.log('file is not mp3 or wav')
        view_error();
        return
    }
    audioFileSizeMB = files[0].size / 1000000;
    error_if_file_too_big(audioFileSizeMB);
    file = URL.createObjectURL(files[0]);
    console.log("this is file", file);
    document.getElementById('originalAudioId').setAttribute('data-src', file);
    // getAudioLength(file);
    console.log(file);
    fileToSend = files[0]
    var fileType = fileToSend.type;
    beginUpload(fileType, file);
    view_chooseOptions();
};

async function checkExistsThenUpdate(allUrls) {
    var check = '';
    if (numberTracks == '2') {
        var check = await checkIfFileExistsYet(allUrls['vocals']);
        var checkError = await checkIfFileExistsYet(allUrls['errorFile']);
    }
    if (numberTracks == '4') {
        var check = await checkIfFileExistsYet(allUrls['other']);
        var checkError = await checkIfFileExistsYet(allUrls['errorFile']);
    }
    if (numberTracks == '5') {
        var check = await checkIfFileExistsYet(allUrls['piano']);
        var checkError = await checkIfFileExistsYet(allUrls['errorFile']);
    }
    if (check['status'] == 200) {
        updateAudioElements(allUrls);
        return
    } else if (checkError['status'] == 200) {
        view_error();
        return
    } else {
        await new Promise(r => setTimeout(r, 4000));
        checkExistsThenUpdate(allUrls);
    }
}

async function writeDBsplitOptions() {
    var tracks = document.getElementsByName('tracks')[0].value;
    var outputFormat = document.getElementsByName('outputFormat')[0].value;
    let delay = update_time_estimated(tracks);
    view_loading();
    beginPolling(delay);
    console.log('wrote to db split options');
    numberTracks = tracks;
    console.log('tracks', tracks);
    console.log('outputFormat', outputFormat);

    var splitOptions = {
        'tracks': tracks,
        'outputFormat': outputFormat,
        'objectKey': objectKey,
        'audioFileSizeMB': audioFileSizeMB,
        'audioLengthMinutes': audioLengthMinutes
    }
    console.log('audioFileSizeMB', audioFileSizeMB)
    console.log('audioLengthMinutes', audioLengthMinutes)
    await fetch("https://j0b0ap2u5j.execute-api.us-east-1.amazonaws.com/default/song-donkey-dynamodb", {
        method: 'POST',
        body: JSON.stringify(splitOptions)
    })
        .then((response) => response.json())
        .then((result) => {
        })
        .catch((error) => {
            console.error('Error:', error);
            view_error();
        });
}

function isFileLarge(length) {
    if (length > 7.5) {
        console.log('file is large');
        return true
    } else if (length <= 7.5) {
        console.log('file is small');
        return false
    }
}
function error_if_file_too_big(audioFileSizeMB) {
    if (audioFileSizeMB > 300) {
        view_error()
    }
}

async function beginPolling(delay) {
    // wait 20 seconds
    await new Promise(r => setTimeout(r, delay));
    var objectKeyNameOnly = objectKey.split(".")[0];
    var outputFormat = document.getElementsByName('outputFormat')[0].value;
    var s3BucketURL = 'https://song-splitter-output.s3.amazonaws.com/';
    var accompanimentURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/accompaniment${outputFormat}`;
    var vocalsURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/vocals${outputFormat}`;
    var bassURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/bass${outputFormat}`;
    var drumsURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/drums${outputFormat}`;
    var otherURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/other${outputFormat}`;
    var pianoURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/piano${outputFormat}`;
    var zipURL = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/SongDonkey.zip`;
    var errorFile = `${s3BucketURL}/mnt/somepath/${objectKeyNameOnly}/error.txt`;

    var allUrls = {
        'accompaniment': accompanimentURL,
        'vocals': vocalsURL,
        'bass': bassURL,
        'drums': drumsURL,
        'other': otherURL,
        'piano': pianoURL,
        'zip': zipURL,
        'errorFile': errorFile
    };
    await checkExistsThenUpdate(allUrls);
}

async function getPresignedURL(fileType, is_large) {
    if (is_large == false) {
        // var url = "https://rvs3mygk4h.execute-api.us-east-1.amazonaws.com/default/getPresignedURL";
        //this is the new rest protected api
        var url = "https://p1u8lvzspb.execute-api.us-east-1.amazonaws.com/default/getPresignedURL";
    } else if (is_large == true) {
        var url = "https://at3r2pm991.execute-api.us-east-1.amazonaws.com/default/getPresignedUrlLargeBucket";
    }
    var presignedURL = '';
    var objectKey = '';
    console.log('url', url);
    await fetch(url, {
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


async function uploadData(url, data) {

    let request = new XMLHttpRequest();
    request.open('PUT', url);

    // upload progress event
    request.upload.addEventListener('progress', function (e) {
        // upload progress as percentage
        let percent_completed = Math.round((e.loaded / e.total) * 100);
        let width = `${percent_completed.toString()}%`;
        document.getElementById('uploadProgress').style.width = width;
        // if (percent_completed == 100) {
        //     document.getElementById('uploadingBar').style.visibility = 'hidden';
        //     document.getElementById('disableClick').classList.remove('disableClick');
        // }
    });

    request.onreadystatechange = function () { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            // Request finished. Do processing here.
            document.getElementById('uploadingBar').style.visibility = 'hidden';
            document.getElementById('disableClick').classList.remove('disableClick');
        } else if (this.readyState === XMLHttpRequest.DONE && this.status !== 200) {
            // Request finished. Do processing here.
            view_error();
        }
    }

    // request finished event
    request.addEventListener('load', function (e) {
        // HTTP status message (200, 404 etc)
        console.log('status', request.status);

        // request.response holds response from the server
        console.log('response', request.response);
        console.log('uploaded');
    });

    // send POST request to server
    request.send(data);
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
            if (response["status"] == 500) {
                console.log("api returned an error 500");
                view_error();
            }
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
        document.getElementById('zipDownload').href = allUrls['zip'];
        document.getElementById('zipDownloadText').href = allUrls['zip'];
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
        document.getElementById('zipDownload').href = allUrls['zip'];
        document.getElementById('zipDownloadText').href = allUrls['zip'];
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
        document.getElementById('zipDownload').href = allUrls['zip'];
        document.getElementById('zipDownloadText').href = allUrls['zip'];
    }
    view_results();
}


async function beginUpload(fileType, file) {
    // console.log(file)
    // if (fileType != 'audio/mpeg' && fileType != 'audio/wav') {
    //     console.log('filetype not mpeg or wav');
    //     view_error();
    //     return
    // }
    var length = await getAudioLength(file);
    var is_large = isFileLarge(length);
    console.log('beginning upload');
    params = await getPresignedURL(fileType, is_large);
    objectKey = params['objectKey'];
    var presignedURL = await params['presignedURL'];
    uploadData(presignedURL, fileToSend);
}

async function download(audioId) {
    var url = document.getElementById(audioId).getAttribute('data-src');
    // var obj = await fetch(url);
    var urlSplit = url.split('/');
    var filename = urlSplit[urlSplit.length - 1];
    console.log(filename);
    const blob = await (await fetch(url, { method: 'GET' })).blob();
    const blobUrl = URL.createObjectURL(blob);
    var element = document.createElement('a');
    element.setAttribute('href', blobUrl);
    element.setAttribute('download', filename);
    element.click();
    element.remove();
}

async function getAudioLength(file) {
    var audioObj = new Audio(file);
    while (isNaN(audioObj.duration) == true) {
        await new Promise(r => setTimeout(r, 500));
    }
    audioLengthMinutes = audioObj.duration / 60;
    return audioLengthMinutes
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
        audioFileSizeMB = data.size / 1000000;
        file = URL.createObjectURL(data);
        console.log('this is the file getting sent', file);
        getAudioLength(file);
        console.log("this is file", file);
        document.getElementById('originalAudioId').setAttribute('data-src', file);
        fileToSend = data;
        var fileType = fileToSend.type;
        beginUpload(fileType, file);
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


async function slowMessage(animation_time) {
    console.log('slow timer started');
    await new Promise(r => setTimeout(r, animation_time * 1000));
    document.getElementById('timeEstimate').innerHTML = 'Your song is still processing, please wait a further 29 seconds';
    document.getElementById('timed-progress').classList.add('hideElement');
    document.getElementById('timed-progress-20').classList.remove('hideElement');
    await new Promise(r => setTimeout(r, 29000));
    document.getElementById('timeEstimate').innerHTML = 'Your song is still processing...';
    return
}

async function timeoutErrorMessage() {
    console.log('timeout error timer started');
    await new Promise(r => setTimeout(r, 1200000)); //20 minutes
    if (document.getElementById('resultsDiv').classList.contains('hideElement')) {
        view_error();
    }
    return
}


function view_begin() {

}
function view_chooseOptions() {
    var x = window.matchMedia("(max-width: 800px)");
    document.getElementById('insideDropTarget').classList.add('hideElement');
    document.getElementById('insideDropTargetSecondPage').classList.remove('hideElement');
    if (x.matches) {
        document.getElementById('soundcloudExamples').classList.add('hideElement');
        document.getElementById('title').classList.add('hideElement');
        document.getElementById('subtitle').classList.add('hideElement');
        document.getElementById('droptarget').style.marginTop = '20%';
    }
}
function view_loading() {
    // begin timer
    timeoutErrorMessage();
    var x = window.matchMedia("(max-width: 800px)");
    document.getElementById('insideDropTarget').classList.add('hideElement');
    document.getElementById('insideDropTargetSecondPage').classList.add('hideElement');
    document.getElementById('insideDropTargetThirdPage').classList.remove('hideElement');
    if (x.matches) {
        document.getElementById('soundcloudExamples').classList.add('hideElement');
        document.getElementById('title').classList.add('hideElement');
        document.getElementById('subtitle').classList.add('hideElement');
        document.getElementById('droptarget').style.marginTop = '20%';
    }
}
function view_results() {
    var x = window.matchMedia("(max-width: 800px)");
    document.getElementById('mainDiv').classList.add("hideElement");
    document.getElementById('resultsDiv').classList.remove('hideElement');
    document.getElementById('donations').classList.remove('hideElement');
}

function view_error() {
    document.getElementById('mainDiv').classList.add("hideElement");
    document.getElementById('resultsDiv').classList.add('hideElement');
    document.getElementById('errorDiv').classList.remove('hideElement');
}


// I need to use cloneNode(true) so that it copies the nested children
// but doing the state stuff and template can come with the speed improvement


var x, i, j, l, ll, selElmnt, a, b, c;
/*look for any elements with the class "custom-select":*/
x = document.getElementsByClassName("custom-select");
l = x.length;
for (i = 0; i < l; i++) {
    selElmnt = x[i].getElementsByTagName("select")[0];
    ll = selElmnt.length;
    /*for each element, create a new DIV that will act as the selected item:*/
    a = document.createElement("DIV");
    a.setAttribute("class", "select-selected");
    a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
    x[i].appendChild(a);
    /*for each element, create a new DIV that will contain the option list:*/
    b = document.createElement("DIV");
    b.setAttribute("class", "select-items select-hide");
    for (j = 1; j < ll; j++) {
        /*for each option in the original select element,
        create a new DIV that will act as an option item:*/
        c = document.createElement("DIV");
        c.innerHTML = selElmnt.options[j].innerHTML;
        c.addEventListener("click", function (e) {
            /*when an item is clicked, update the original select box,
            and the selected item:*/
            var y, i, k, s, h, sl, yl;
            s = this.parentNode.parentNode.getElementsByTagName("select")[0];
            sl = s.length;
            h = this.parentNode.previousSibling;
            for (i = 0; i < sl; i++) {
                if (s.options[i].innerHTML == this.innerHTML) {
                    s.selectedIndex = i;
                    h.innerHTML = this.innerHTML;
                    y = this.parentNode.getElementsByClassName("same-as-selected");
                    yl = y.length;
                    for (k = 0; k < yl; k++) {
                        y[k].removeAttribute("class");
                    }
                    this.setAttribute("class", "same-as-selected");
                    break;
                }
            }
            h.click();
        });
        b.appendChild(c);
    }
    x[i].appendChild(b);
    a.addEventListener("click", function (e) {
        /*when the select box is clicked, close any other select boxes,
        and open/close the current select box:*/
        e.stopPropagation();
        closeAllSelect(this);
        this.nextSibling.classList.toggle("select-hide");
        this.classList.toggle("select-arrow-active");
    });
}
function closeAllSelect(elmnt) {
    /*a function that will close all select boxes in the document,
    except the current select box:*/
    var x, y, i, xl, yl, arrNo = [];
    x = document.getElementsByClassName("select-items");
    y = document.getElementsByClassName("select-selected");
    xl = x.length;
    yl = y.length;
    for (i = 0; i < yl; i++) {
        if (elmnt == y[i]) {
            arrNo.push(i)
        } else {
            y[i].classList.remove("select-arrow-active");
        }
    }
    for (i = 0; i < xl; i++) {
        if (arrNo.indexOf(i)) {
            x[i].classList.add("select-hide");
        }
    }
}
/*if the user clicks anywhere outside the select box,
then close all select boxes:*/
document.addEventListener("click", closeAllSelect);


// navbar open and close
function openNav(event) {
    event.stopPropagation();
    document.getElementById('nav').style.display = 'flex';
    document.body.addEventListener('click', closeNav);
}

function closeNav() {
    document.getElementById('nav').style.display = 'none';
    document.body.removeEventListener('click', closeNav);
}


let estimated_times = {
    //first number rounds nearest minutes, second is 5/4 tracks or 2 tracks
    '0_2': { 'message': 'Estimated time 29 seconds', 'milliseconds': 29000, 'delay': 20000 },
    '0_5': { 'message': 'Estimated time 29 seconds', 'milliseconds': 29000, 'delay': 20000 },
    '1_2': { 'message': 'Estimated time 29 seconds', 'milliseconds': 29000, 'delay': 20000 },
    '1_5': { 'message': 'Estimated time 29 seconds', 'milliseconds': 29000, 'delay': 20000 },
    '2_2': { 'message': 'Estimated time 29 seconds', 'milliseconds': 29000, 'delay': 20000 },
    '2_5': { 'message': 'Estimated time 39 seconds', 'milliseconds': 39000, 'delay': 30000 },
    '3_2': { 'message': 'Estimated time 39 seconds', 'milliseconds': 39000, 'delay': 30000 },
    '3_5': { 'message': 'Estimated time 1 minute 9 seconds', 'milliseconds': 69000, 'delay': 60000 },
    '4_2': { 'message': 'Estimated time 39 seconds', 'milliseconds': 39000, 'delay': 30000 },
    '4_5': { 'message': 'Estimated time 1 minute 9 seconds', 'milliseconds': 69000, 'delay': 60000 },
    '5_2': { 'message': 'Estimated time 49 seconds', 'milliseconds': 49000, 'delay': 40000 },
    '5_5': { 'message': 'Estimated time 1 minute 39 seconds', 'milliseconds': 99000, 'delay': 90000 },
    '5-7_2': { 'message': 'Estimated time 49 seconds', 'milliseconds': 49000, 'delay': 40000 },
    '5-7_5': { 'message': 'Estimated time 1 minute 49 seconds', 'milliseconds': 109000, 'delay': 90000 },
    '7-14_2': { 'message': 'Estimated time 2 minutes 10 seconds', 'milliseconds': 130000, 'delay': 100000 },
    '7-14_5': { 'message': 'Your audio file is larger than usual, please allow up to 5 minutes', 'milliseconds': 300000, 'delay': 200000 },
    '14-21_2': { 'message': 'Estimated time 3 minutes 20 seconds', 'milliseconds': 200000, 'delay': 150000 },
    '14-21_5': { 'message': 'Your audio file is larger than usual, please allow up to 6 minutes', 'milliseconds': 360000, 'delay': 200000 },
    '21+_2': { 'message': 'Your audio file is larger than usual, please allow up to 5 minutes', 'milliseconds': 300000, 'delay': 200000 },
    '21+_5': { 'message': 'Your audio file is larger than usual, please allow up to 8 minutes', 'milliseconds': 480000, 'delay': 300000 }
}

function update_time_estimated(tracks) {
    let length = Math.round(audioLengthMinutes)
    let num_tracks = tracks
    if (tracks == 4) {
        num_tracks = 5
    }
    if (length > 5) {
        if (length < 7) {
            length = '5-7'
        } else if (length < 14) {
            length = '7-14'
        } else if (length < 21) {
            length = '14-21'
        } else {
            length = '21+'
        }
    }

    let key = `${length}_${num_tracks}`
    let estimate = estimated_times[key]
    let estimate_message = estimate['message']
    let animation_time = estimate['milliseconds'] / 1000
    let delay = estimate['delay']
    document.getElementById('timeEstimate').innerHTML = estimate_message;
    document.getElementById('timed-progress').style.animationDuration = `${animation_time}s`;
    slowMessage(animation_time);
    return delay
}