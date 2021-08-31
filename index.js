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
var urlOfSplitter = 'https://uhuikcje97.execute-api.us-east-1.amazonaws.com/default/song-splitter-image-function';
var numberTracks = '';
var startTime;

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
    if (check["status"] == 403 && checkError["status"] == 403) {
        console.log("it doesn't exist yet");
        await new Promise(r => setTimeout(r, 2000));
        checkExistsThenUpdate(allUrls);
    } else {
        if (check["status"] == 403) {
            console.log('error file exists');
            view_error();
        } else {
            console.log("the last files exists");
            updateAudioElements(allUrls);
            return;
        }
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
            document.getElementById('disableClick').classList.remove('disableClick');
            // view_loading();
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    return response;
}

async function runSplitter(url, options) {
    console.log("Running AI");
    startTime = Date.getTime();
    console.log('starting timer', startTime);
    // var objectKey = { 'objectKey': data };
    var splitterResponse = {};
    await fetch(url, {
        method: 'POST',
        body: JSON.stringify(options)
    })
        .then((response) => {
            console.log("run splitter response", response);
            splitterResponse = response;
            if (response["status"] = 503 && (Date.getTime() - startTime) < 25000 ) {
                console.log("api returned an error 503 in under 25seconds")
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