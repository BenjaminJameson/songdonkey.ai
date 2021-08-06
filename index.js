
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
