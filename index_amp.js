var eminem = 'https://song-splitter-bucket.s3.amazonaws.com/1079040578.mp3';
var longerSong = 'https://song-splitter-bucket.s3.amazonaws.com/1687030339.mp3';
var img = 'https://cdn.shopify.com/s/files/1/1061/1924/products/Man_Saying_Hi_Emoji_Icon_ios10_1024x1024.png?v=1571606091';
var vocals = document.getElementById("vocals");
console.log("vocals", vocals);
console.log("YESSSSSS");
const audio_file = document.getElementById("audio_file");
console.log("audio", audio_file);

// When the draggable p element enters the droptarget, change the DIVS's border style
document.addEventListener("dragenter", function (event) {
    console.log("dragenter");
    console.log(event.target);
    if (event.target.className == "myDiv") {
        event.target.style.border = "3px dotted red";
    }
});
document.addEventListener("dragover", function (event) {
    // console.log("dragover");
    event.preventDefault();
});
document.addEventListener("drop", function (event) {
    console.log("DROPPPPPED");
    event.preventDefault();

    console.log(event.dataTransfer.items[0].getAsFile());
    if (event.target.className == "droptarget") {
        document.getElementById("demo").style.color = "";
        event.target.style.border = "";
        var data = event.dataTransfer.getData("Text");
        event.target.appendChild(document.getElementById(data));
    }
});

// document.addEventListener('drop', function (event) {
//     console.log("something dropped");
// })

// audio_file.addEventListener('drop', (event) => {
//     console.log("DROPPPPPED");
//     console.log("src", vocals.src);
//     vocals.src = longerSong;
//     const testAudio = document.createElement('img');
//     testAudio.setAttribute("src", img);
//     // testAudio.setAttribute("layout", "responsive");
//     document.body.appendChild(testAudio);
// });

// audio_file.onchange = function () {
//     files = this.files;
//     file = URL.createObjectURL(files[0]);
//     audio_player.src = file;
//     console.log(file);
//     var fileToSend = files[0];

//     uploadAndRunAI(fileToSend);
// };

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
