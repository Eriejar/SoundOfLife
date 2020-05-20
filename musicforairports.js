

const SAMPLE_LIBRARY = {
    'Kalimba': [
        {note:'C', octave: 4, file: 'Samples/Cassette_Bell_C.wav'}
    ],
    'Choir': [
        {note:'C', octave: 5, file: 'Samples/Kawai_Choir_C.wav'}
    ]
};

const OCTAVE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 
                'G', 'G#', 'A', 'A#', 'B'];


let audioContext = new AudioContext();
const listener = audioContext.listener;

const posX = window.innerWidth/2;
const posY = window.innerHeight/2;
const posZ = 300;

listener.positionX.value = posX;
listener.positionY.value = posY;
listener.positionZ.value = posZ-5;

const masterGainNode = audioContext.createGain();

// Setting up panner node

function createPanner() {

    let pannerModel = 'HRTF';
    let innerCone = 60;
    let outerCone = 90;
    let outerGain = 0.3;

    let distanceModel = 'linear';
    let maxDistance = 10000;
    let refDistance = 1;
    let rollOff = 10;

    let positionX = posX;
    let positionY = posY;
    let positionZ = 295;

    let orientationX = 0.0;
    let orientationY = 0.0;
    let orientationZ = -1.0;

    var panner = new PannerNode(audioContext, {
    panningModel: pannerModel,
    distanceModel: distanceModel,
    positionX: positionX,
    positionY: positionY,
    positionZ: positionZ,
    orientationX: orientationX,
    orientationY: orientationY,
    orientationZ: orientationZ,
    refDistance: refDistance,
    maxDistance: maxDistance,
    rolloffFactor: rollOff,
    coneInnerAngle: innerCone,
    coneOuterAngle: outerCone,
    coneOuterGain: outerGain
    });
    return panner;
}


function noteValue(note, octave) {
    // 1) multiply octave base note
    // D3 => 3 * 12 = 36
    // 2) find index of note within octave
    // 3) sum together to get numeric value 36+2=38
    return octave * 12 + OCTAVE.indexOf(note);
}

function fetchSample(path) {
    return fetch(encodeURIComponent(path))
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer, (data) => buffer = data));
}

function getNoteDistance(note1, octave1, note2, octave2) {
    return noteValue(note1, octave1) - noteValue(note2, octave2);
}

function getNearestSample(sampleBank, note, octave) {
    // returns closest sample in the sampleBank
    let sortedBank = sampleBank.slice().sort((sampleA, sampleB) => {
        let distanceToA = 
            Math.abs(getNoteDistance(note, ocatve, sampleA.note, sampleA.octave));
        let distanceToB = 
            Math.abs(getNoteDistance(note, octave, sampleB.note, sampleB.octave));
        return distanceToA - distanceToB;
    });
    return sortedBank[0];
}

function flatToSharp(note) {
    switch (note) {
        case 'Bb': return 'A#';
        case 'Db': return 'C#';
        case 'Eb': return 'D#';
        case 'Gb': return 'F#';
        case 'Ab': return 'G#';
        default:   return note;
    }
}



function getSample(instrument, noteAndOctave) {
    let [, requestedNote, requestedOctave] = /^(\w[b#]?)(\d)$/.exec(noteAndOctave);
    requestedOctave = parseInt(requestedOctave, 10);
    requestedNote = flatToSharp(requestedNote);
    let sampleBank = SAMPLE_LIBRARY[instrument];
    let sample = getNearestSample(sampleBank, requestedNote, requestedOctave);
    let distance = 
        getNoteDistance(requestedNote, requestedOctave, sample.note, sample.octave);

    return fetchSample(sample.file).then(audioBuffer => ({
        audioBuffer: audioBuffer,
        distance: distance
    }))

}

function playSample(instrument, note, destination, delaySeconds = 0) {
    getSample(instrument, note).then(({audioBuffer, distance}) => {
        let playbackRate = Math.pow(2, distance/12);
        let bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.playbackRate.value = playbackRate;

        var myVolume = [-10, 0, 10];
        var gainNode =  audioContext.createGain();
        var randomDB = myVolume[(Math.random() * myVolume.length) | 0];
        var ratio = 10 ** (randomDB / 20)
        gainNode.gain.value = ratio;

        var myArray = [-3000, 3000];
        var pannerNode = createPanner();
        pannerNode.positionX.value = myArray[(Math.random() * myArray.length) | 0];

        
        bufferSource.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(destination);

        bufferSource.start(audioContext.currentTime + delaySeconds);
    })
}

function startLoop(instrument, note, destination, loopLengthSeconds, delaySeconds) {
    playSample(instrument, note, destination, delaySeconds);
    setInterval(
        () => playSample(instrument, note, destination, delaySeconds),
        loopLengthSeconds * 1000
    );
}

/*
const audio = new Audio(SAMPLE_LIBRARY['Kalimba'][0].file);

c_file = SAMPLE_LIBRARY['Kalimba'][0].file;

const audioCtx = new AudioContext();
let buffer = null;

const load = () => {
    const request = new XMLHttpRequest();
    request.open("GET", c_file);
    request.responseType = "arraybuffer";
    request.onload = function() {
        let undecodedAudio = request.response;
        audioCtx.decodeAudioData(undecodedAudio, (data) => buffer = data);
    };
    request.send();
}

const play = () => {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
} */


fetchSample('GiantCave.wav').then(convolverBuffer => {

    let convolver = audioContext.createConvolver();
    convolver.buffer = convolverBuffer;
    

    convolver.connect(masterGainNode);
    // masterGainNode.connect(audioContext.destination);

    masterGainNode.gain.value = dbToRatio(-20);
    
    startLoop('Choir', 'F5', convolver, 19.7, 4.0);
    startLoop('Kalimba', 'Ab4',convolver,  17.8, 8.1);
    startLoop('Choir', 'C5',  convolver, 21.3, 5.6);
    startLoop('Kalimba', 'Db5',convolver,  22.1, 12.6);
    startLoop('Kalimba', 'Eb5',convolver,  18.4, 9.2);
    startLoop('Kalimba', 'F5',  convolver, 20.0, 14.1);
    startLoop('Kalimba', 'Ab5',convolver,  17.7, 3.1);
});

playing = false;

function toggle() {
    if (playing) {
        console.log("disconnecting");
        masterGainNode.disconnect(audioContext.destination);
        document.getElementById("toggle").innerHTML = "Play!";
        playing = false;
    }
    else {
        console.log("connecting");
        masterGainNode.connect(audioContext.destination);
        document.getElementById("toggle").innerHTML = "Pause";
        playing = true;
    }
        
}


function dbToRatio(db) {
    return 10 ** (db / 20);
}

var slider = document.getElementById("volumeSlider");
var output = document.getElementById("demo");
output.innerHTML = slider.value;

slider.oninput = function() {
    output.innerHTML = slider.value;
    masterGainNode.gain.value = dbToRatio(slider.value);
}

var button = document.getElementById("toggle");

button.onclick = toggle;